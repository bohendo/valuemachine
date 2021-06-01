import { AddressZero } from "@ethersproject/constants";
import {
  AddressBook,
  Assets,
  Event,
  EventTypes,
  Logger,
  Prices,
  StateJson,
  TradeEvent,
  Transaction,
  TransferCategories,
  TransferCategory,
} from "@finances/types";
import { getLogger, math } from "@finances/utils";

import { emitTransferEvents } from "./events";
import { getState } from "./state";
import { rmDups } from "./transactions/utils";

const { Deposit, Internal, SwapIn, SwapOut } = TransferCategories;
const { add, mul, round } = math;

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
    const tradeEvent = {
      date: transaction.date,
      prices: {},
      type: EventTypes.Trade,
    } as TradeEvent;
    const swapsIn = transaction.transfers.filter(t => t.category === SwapIn);
    const swapsOut = transaction.transfers.filter(t => t.category === SwapOut);
    if (swapsIn.length && swapsOut.length) {
      const sum = (acc, cur) => add(acc, cur.quantity);
      const assetsOut = rmDups(swapsOut.map(swap => swap.asset));
      const assetsIn = rmDups(swapsIn.map(swap => swap.asset)
        .filter(asset => !assetsOut.includes(asset)) // remove refunds from the output asset list
      );
      // Save prices at the time of this tx
      for (const asset of rmDups([...assetsIn, ...assetsOut]) as Assets[]) {
        tradeEvent.prices[asset] = prices.getPrice(transaction.date, asset, unit);
      }
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

      tradeEvent.description = `Traded ${
        assetsOut.map((asset, i) => `${round(amtsOut[i])} ${asset}`).join(" & ")
      } for ${
        assetsIn.map((asset, i) => `${round(amtsIn[i])} ${asset}`).join(" & ")
      }`;
      tradeEvent.inputs = inputs;
      tradeEvent.outputs = outputs;

      // TODO: abort or handle if to/from values aren't consistent among swap chunks
      tradeEvent.from = swapsOut[0].from;
      tradeEvent.to = swapsIn[0].to;

      // Process trade
      let chunks = [] as any;
      for (const [asset, quantity] of Object.entries(outputs)) {
        chunks = state.getChunks(
          tradeEvent.from, asset as Assets, quantity as string, transaction, unit,
        );
        tradeEvent.spentChunks = [...chunks]; // Assumes chunks are never modified.. Is this safe?
        chunks.forEach(chunk => state.putChunk(swapsOut[0].to, chunk));
      }
      for (const [asset, quantity] of Object.entries(inputs)) {
        chunks = state.getChunks(
          AddressZero, asset as Assets, quantity as string, transaction, unit,
        );
        chunks.forEach(chunk => state.putChunk(tradeEvent.to, chunk));
      }
      events.push(tradeEvent);

    } else if (swapsIn.length && !swapsOut.length) {
      log.warn(swapsIn, `Can't find swaps out to match swaps in`);
      later.push(...swapsIn);
    } else if (!swapsIn.length && swapsOut.length) {
      log.warn(swapsOut, `Can't find swaps in to match swaps out`);
      later.push(...swapsOut);
    }

    ////////////////////
    // Create special accounts
    transaction.transfers.filter(
      t => ([Deposit, Internal] as TransferCategory[]).includes(t.category)
    ).forEach(transfer => state.createAccount(transfer.to));

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
