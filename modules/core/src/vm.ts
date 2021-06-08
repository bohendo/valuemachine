import { isAddress } from "@ethersproject/address";
import { AddressZero } from "@ethersproject/constants";
import {
  Account,
  AddressBook,
  AssetChunk,
  Assets,
  Blockchains,
  DecimalString,
  Event,
  EventTypes,
  Events,
  Logger,
  StateJson,
  TradeEvent,
  Transaction,
  Transfer,
  TransferCategories,
  TransferCategory,
} from "@finances/types";
import { getJurisdiction, getLogger, math } from "@finances/utils";

import { getState } from "./state";
import { rmDups } from "./transactions/utils";

const {
  Internal,
  Income, Expense,
  Deposit, Withdraw,
  Borrow, Repay,
  SwapIn, SwapOut,
} = TransferCategories;
const { add, mul, round } = math;

export const getValueMachine = ({
  addressBook,
  logger,
}: {
  addressBook: AddressBook,
  logger?: Logger
}): any => {
  const log = (logger || getLogger()).child({ module: "ValueMachine" });
  const { getName } = addressBook;

  return (oldState: StateJson, transaction: Transaction): [StateJson, Event[]] => {
    const state = getState({ stateJson: oldState, addressBook, logger });
    log.debug(`Applying transaction ${transaction.index} from ${
      transaction.date
    }: ${transaction.description}`);
    log.debug(`Applying transfers: ${
      JSON.stringify(transaction.transfers, null, 2)
    } to sub-state ${
      JSON.stringify(state.getRelevantBalances(transaction), null, 2)
    }`);
    const events = [] as Event[];

    const emitJurisdictionChange = (
      asset: Assets,
      quantity: DecimalString,
      from: Account,
      to: Account,
      transaction: Transaction,
      chunks: AssetChunk[],
    ): Events => {
      const oldJurisdiction = getJurisdiction(from);
      const newJurisdiction = getJurisdiction(to);
      if (oldJurisdiction === newJurisdiction) {
        return [];
      }
      return [{
        asset: asset,
        date: transaction.date,
        description: `${round(quantity)} ${
          asset
        } moved jurisdictions from ${oldJurisdiction} to ${newJurisdiction}`,
        from: from,
        movedChunks: chunks,
        newBalances: {
          [to]: { [asset]: state.getBalance(to, asset) },
          [from]: { [asset]: state.getBalance(from, asset) },
        },
        newJurisdiction,
        oldJurisdiction,
        quantity: quantity,
        tags: transaction.tags,
        to: to,
        type: EventTypes.JurisdictionChange,
      }];
    };

    const emitTransferEvents = (
      addressBook: AddressBook,
      chunks: AssetChunk[],
      transaction: Transaction,
      transfer: Transfer,
    ): Events => {
      const { getName } = addressBook;
      const events = [];
      const { asset, category, from, quantity, to } = transfer;
      events.push(...emitJurisdictionChange(
        asset as Assets,
        quantity as DecimalString,
        from,
        to,
        transaction,
        chunks
      ));
      if (
        // Skip tx fees for now, too much noise
        (category === Expense && Object.keys(Blockchains).includes(to))
        || (category === Internal && isAddress(to)) // We might not ever need these
      ) {
        return events;
      }
      const amt = round(quantity);
      const newEvent = {
        asset: asset,
        category,
        date: transaction.date,
        description: 
          (category === Income) ? `Received ${amt} ${asset} from ${getName(from)}`
          : (category === Internal) ? `Moved ${amt} ${asset} from ${getName(from)} to ${getName(to)}`
          : (category === Expense) ? `Paid ${amt} ${asset} to ${getName(to)}`
          : (category === Repay) ? `Repayed ${amt} ${asset} to ${getName(to)}`
          : (category === Deposit) ? `Deposited ${amt} ${asset} to ${getName(to)}`
          : (category === Borrow) ? `Borrowed ${amt} ${asset} from ${getName(from)}`
          : (category === Withdraw) ? `Withdrew ${amt} ${asset} from ${getName(from)}`
          : "?",
        from: transfer.from,
        quantity,
        tags: transaction.tags,
        to: transfer.to,
        type: EventTypes.Transfer,
      } as Event;
      // We exclude internal transfers so both to & from shouldn't be self/abstract
      newEvent.newBalances = {
        [transfer.to]: { [asset]: state.getBalance(transfer.to, asset) },
        [transfer.from]: { [asset]: state.getBalance(transfer.from, asset) },
      };
      events.push(newEvent);
      return events;
    };

    const handleTransfer = (
      transfer: Transfer,
    ): void => {
      const { asset, from, quantity, to } = transfer;
      if (
        !Object.values(Assets).includes(asset) &&
        !addressBook.isToken(asset)
      ) {
        log.debug(`Skipping transfer of unsupported token: ${asset}`);
        return;
      }
      log.debug(`transfering ${quantity} ${asset} from ${getName(from)} to ${getName(to)}`);
      let chunks;
      try {
        chunks = state.getChunks(
          from,
          asset,
          quantity,
          transaction.date,
          transfer,
          events,
        );
        chunks.forEach(chunk => state.putChunk(to, chunk));
        events.push(
          ...emitTransferEvents(addressBook, chunks, transaction, transfer)
        );
      } catch (e) {
        log.warn(`Error while processing tx ${e.message}: ${JSON.stringify(transaction)}`);
        if (e.message.includes("attempted to spend")) {
          later.push(transfer);
        } else {
          throw e;
        }
      }
    };

    ////////////////////////////////////////
    // VM Core

    // Transfers to process at the end eg if something goes wrong on the first attempt
    const later = [];

    ////////////////////
    // Trades
    const tradeEvent = {
      date: transaction.date,
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

      // TODO: abort or handle when to/from values aren't consistent among swap chunks
      // eg we could add a synthetic internal transfer then make the swap touch only one account
      tradeEvent.account = swapsIn[0].to || swapsOut[0].from;

      // Process trade
      let chunks = [] as any;
      for (const [asset, quantity] of Object.entries(outputs)) {
        chunks = state.getChunks(
          tradeEvent.account,
          asset as Assets,
          quantity as string,
          transaction.date,
        );
        tradeEvent.spentChunks = [...chunks]; // Assumes chunks are never modified.. Is this safe?
        chunks.forEach(chunk => state.putChunk(swapsOut[0].to, chunk));
      }
      for (const [asset, quantity] of Object.entries(inputs)) {
        chunks = state.getChunks(
          AddressZero,
          asset as Assets,
          quantity as string,
          transaction.date,
        );
        chunks.forEach(chunk => state.putChunk(tradeEvent.account, chunk));
        // TODO: prevent trades from crossing jurisdictions
        events.push(...emitJurisdictionChange(
          asset as Assets,
          quantity as DecimalString,
          swapsIn[0].from,
          swapsIn[0].to,
          transaction,
          chunks
        ));
      }

      tradeEvent.newBalances = { [tradeEvent.account]: {} };
      for (const asset of rmDups(
        Object.keys(inputs).concat(Object.keys(outputs))
      ) as Assets[]) {
        tradeEvent.newBalances[tradeEvent.account][asset] =
          state.getBalance(tradeEvent.account, asset);
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
    transaction.transfers.filter(
      t => !([SwapIn, SwapOut] as TransferCategory[]).includes(t.category)
    ).forEach(handleTransfer);

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
      const chunks = state.getChunks(
        from,
        asset,
        quantity,
        transaction.date,
        transfer,
        events,
      );
      chunks.forEach(chunk => state.putChunk(to, chunk));
      events.push(
        ...emitTransferEvents(addressBook, chunks, transaction, transfer)
      );
    }

    ////////////////////////////////////////

    state.touch(transaction.date);
    return [state.toJson(), events];
  };
};
