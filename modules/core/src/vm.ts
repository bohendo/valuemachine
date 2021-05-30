import {
  AddressBook,
  Assets,
  Event,
  EventTypes,
  Logger,
  Prices,
  StateJson,
  Transaction,
  TransferCategories,
  TransferCategory,
} from "@finances/types";
import { getLogger, math } from "@finances/utils";

import { emitTransferEvents } from "./events";
import { getState } from "./state";
import { rmDups } from "./transactions/utils";

const { SwapIn, SwapOut } = TransferCategories;
const { eq, add, mul, round } = math;

export const getValueMachine = ({
  addressBook,
  prices,
  logger,
  unit: defaultUnit,
}: {
  addressBook: AddressBook,
  prices: Prices,
  logger?: Logger
  unit?: Assets,
}): any => {
  const unit = defaultUnit || Assets.ETH;
  const log = (logger || getLogger()).child({ module: "ValueMachine" });
  const { getName } = addressBook;

  return (oldState: StateJson, transaction: Transaction): [StateJson, Event[]] => {
    const state = getState({ stateJson: oldState, addressBook, prices, logger });
    log.debug(`Applying transaction ${transaction.index} from ${
      transaction.date
    }: ${transaction.description}`);
    log.debug(`Applying transfers: ${
      JSON.stringify(transaction.transfers, null, 2)
    } to sub-state ${
      JSON.stringify(state.getRelevantBalances(transaction), null, 2)
    }`);
    const events = [] as Event[];

    ////////////////////////////////////////
    // VM Core

    // Transfers to process at the end eg if something goes wrong on the first attempt
    const later = [];

    ////////////////////
    // Trades
    const swapsIn = transaction.transfers.filter(t => t.category === SwapIn);
    const swapsOut = transaction.transfers.filter(t => t.category === SwapOut);
    if (swapsIn.length && swapsOut.length) {
      const sum = (acc, cur) => add(acc, cur.quantity);
      const assetsOut = rmDups(swapsOut.map(swap => swap.asset));
      const assetsIn = rmDups(
        swapsIn
          .map(swap => swap.asset)
          // If some input asset was refunded, remove this from the output asset list
          .filter(asset => !assetsOut.includes(asset))
      );
      const amtsOut = assetsOut.map(asset =>
        swapsIn
          .filter(swap => swap.asset === asset)
          .map(swap => ({ ...swap, quantity: mul(swap.quantity, "-1") })) // subtract refunds
          .concat(
            swapsOut.filter(swap => swap.asset === asset)
          ).reduce(sum, "0")
      );
      const amtsIn = assetsIn.map(asset =>
        swapsIn.filter(swap => swap.asset === asset).reduce(sum, "0")
      );
      const inputs = {};
      assetsIn.forEach((asset, index) => {
        inputs[asset] = amtsIn[index];
      });
      const outputs = {};
      assetsOut.forEach((asset, index) => {
        outputs[asset] = amtsOut[index];
      });

      // Process trade
      // TODO: abort or whatev if to/from values aren't consistent among swap chunks
      // eg if one account uniswaps & sends the output to a different self account
      let chunks = [] as any;
      const capitalChanges = [] as any;
      for (const [asset, quantity] of Object.entries(outputs)) {
        chunks = state.getChunks(
          swapsOut[0].from, asset as Assets, quantity as string, transaction, unit,
        );
        chunks.forEach(chunk => {
          const currentPrice = prices.getPrice(transaction.date, chunk.asset, unit);
          if (currentPrice) {
            if (!eq(currentPrice, chunk.purchasePrice)) {
              capitalChanges.push({
                asset: chunk.asset,
                quantity: chunk.quantity,
                currentPrice,
                receivePrice: chunk.purchasePrice,
                receiveDate: chunk.dateRecieved,
              });
            }
          } else {
            log.warn(`Price in units of ${unit} is unavailable for ${asset} on ${transaction.date}`);
          }
        });
        chunks.forEach(chunk => state.putChunk(swapsOut[0].to, chunk));
      }
      for (const [asset, quantity] of Object.entries(inputs)) {
        chunks = state.getChunks(
          swapsIn[0].from, asset as Assets, quantity as string, transaction, unit,
        );
        chunks.forEach(chunk => state.putChunk(swapsIn[0].to, chunk));
      }

      // TODO: add capital changes too
      events.push({
        date: transaction.date,
        description: `Traded ${
          assetsOut.map((asset, i) => `${round(amtsOut[i])} ${asset}`).join(" & ")
        } for ${
          assetsIn.map((asset, i) => `${round(amtsIn[i])} ${asset}`).join(" & ")
        }`,
        swapsIn: inputs,
        swapsOut: outputs,
        capitalChanges,
        type: EventTypes.Trade,
      });

    } else if (swapsIn.length && !swapsOut.length) {
      log.warn(swapsIn, `Can't find swaps out to match swaps in`);
      later.push(...swapsIn);
    } else if (!swapsIn.length && swapsOut.length) {
      log.warn(swapsOut, `Can't find swaps in to match swaps out`);
      later.push(...swapsOut);
    }

    ////////////////////
    // Simple Transfers Attempt 1
    for (const transfer of transaction.transfers.filter(
      t => !([SwapIn, SwapOut] as TransferCategory[]).includes(t.category)
    )) {
      const { asset, from, quantity, to } = transfer;
      if (
        !Object.values(Assets).includes(asset) &&
        !addressBook.isToken(asset)
      ) {
        log.debug(`Skipping transfer of unsupported token: ${asset}`);
        continue;
      }
      log.debug(`transfering ${quantity} ${asset} from ${getName(from)} to ${getName(to)}`);
      let chunks;
      try {
        chunks = state.getChunks(from, asset, quantity, transaction, unit);
        chunks.forEach(chunk => state.putChunk(to, chunk));
        events.push(
          ...emitTransferEvents(addressBook, chunks, transaction, transfer, prices, unit)
        );
      } catch (e) {
        log.warn(`Error while processing tx ${e.message}: ${JSON.stringify(transaction)}`);
        if (e.message.includes("attempted to spend")) {
          later.push(transfer);
        } else {
          throw e;
        }
      }
    }

    ////////////////////
    // Simple Transfers Attempt 2
    // Instead of reordering transfers so balances never dip below zero,
    // should we let them go negative only while a tx is being exectued
    // after all transfers have been processed, then we could assert that crypto balances are >=0
    for (const transfer of later) {
      const { asset, from, quantity, to } = transfer;
      log.debug(`transfering ${quantity} ${asset} from ${getName(from)} to ${
        getName(to)
      } (attempt 2)`);
      const chunks = state.getChunks(from, asset, quantity, transaction, unit);
      chunks.forEach(chunk => state.putChunk(to, chunk));
      events.push(
        ...emitTransferEvents(addressBook, chunks, transaction, transfer, prices, unit)
      );
    }

    ////////////////////////////////////////

    state.touch(transaction.date);
    return [state.toJson(), events];
  };
};
