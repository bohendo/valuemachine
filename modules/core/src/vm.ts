import {
  Account,
  AddressBook,
  AssetChunk,
  Assets,
  Blockchains,
  DecimalString,
  Event,
  Events,
  EventTypes,
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

  return (oldState: StateJson, transaction: Transaction): [StateJson, Event[]] => {
    const state = getState({ stateJson: oldState, addressBook, logger });
    log.debug(`Processing transaction ${transaction.index} from ${transaction.date}: ${
      transaction.description
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
      const insecureChunks = state.getInsecure(transaction.date, asset, quantity);
      if (insecureChunks.length) {
        log.warn(`We have ${insecureChunks.length} chunks that are unsecured`);
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
      transfer: Transfer,
      transaction: Transaction,
      chunks: AssetChunk[],
    ): Events => {
      const { getName } = addressBook;
      const { asset, category, from, quantity, to } = transfer;
      // Skip tx fees for now, too much noise
      if (category === Expense && Object.keys(Blockchains).includes(to)) return [];
      const amt = round(quantity);
      const newEvent = {
        asset: asset,
        category,
        date: transaction.date,
        description: `${category} of ${amt} ${asset}`,
        from: transfer.from,
        quantity,
        tags: transaction.tags,
        to: transfer.to,
        type: EventTypes.Transfer,
      } as Event;
      newEvent.newBalances = {};
      if (([
        Internal, Deposit, Withdraw, Expense, SwapOut, Repay
      ] as TransferCategory[]).includes(category)) {
        newEvent.newBalances[transfer.from] = { [asset]: state.getBalance(transfer.from, asset) };
        newEvent.description += ` from ${getName(transfer.from)}`;
      }
      if (([
        Internal, Deposit, Withdraw, Income, SwapIn, Borrow
      ] as TransferCategory[]).includes(category)) {
        newEvent.newBalances[transfer.to] = { [asset]: state.getBalance(transfer.to, asset) };
        newEvent.description += ` to ${getName(transfer.to)}`;
      }
      const events = [newEvent];
      events.push(...emitJurisdictionChange(asset, quantity, from, to, transaction, chunks));
      return events;
    };

    const handleTransfer = (
      transfer: Transfer,
    ): void => {
      const { asset, category, from, quantity, to } = transfer;
      // Move funds from one account to another
      if (([Internal, Deposit, Withdraw] as TransferCategory[]).includes(category)) {
        const chunks = state.getChunks(from, asset, quantity, transaction.date, transfer, events);
        chunks.forEach(chunk => state.putChunk(to, chunk));
      // Send funds out of our accounts
      } else if (([Expense, SwapOut, Repay] as TransferCategory[]).includes(category)) {
        const chunks = state.getChunks(from, asset, quantity, transaction.date, transfer, events);
        chunks.forEach(chunk => state.disposeChunk(chunk, transaction.date, from, to));
        events.push(...emitTransferEvents(transfer, transaction, chunks));
      // Receive funds into one of our accounts
      } else if (([Income, SwapIn, Borrow] as TransferCategory[]).includes(category)) {
        const chunks = [state.receiveChunk(asset, quantity, transaction.date)]; // no sources
        chunks.forEach(chunk => state.putChunk(to, chunk));
        events.push(...emitTransferEvents(transfer, transaction, chunks));
      } else {
        log.warn(transfer, `idk how to process this transfer`);
      }
    };

    ////////////////////////////////////////
    // VM Core

    // Create any new abstract accounts
    transaction.transfers.filter(
      t => ([Deposit, Internal] as TransferCategory[]).includes(t.category)
    ).forEach(transfer => state.createAccount(transfer.to));

    // Process normal transfers & set swaps aside to process more deeply
    const swapsIn = [];
    const swapsOut = [];
    transaction.transfers.forEach(transfer => {
      if (transfer.category === SwapIn) {
        swapsIn.push(transfer);
      } else if (transfer.category === SwapOut) {
        swapsOut.push(transfer);
      } else {
        handleTransfer(transfer);
      }
    });

    // Process trades
    if (swapsIn.length && swapsOut.length) {
      const tradeEvent = {
        date: transaction.date,
        type: EventTypes.Trade,
      } as TradeEvent;
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
      const account = swapsIn[0].to || swapsOut[0].from;
      const exchange = swapsOut[0].to || swapsIn[0].from;
      tradeEvent.account = account;

      // Process trade
      const chunksOut = [] as AssetChunk[];
      for (const output of Object.entries(outputs)) {
        const asset = output[0] as Assets;
        const quantity = output[1] as DecimalString;
        const chunks = state.getChunks(account, asset, quantity, transaction.date);
        chunksOut.push(...chunks);
        chunks.forEach(chunk => state.disposeChunk(chunk, transaction.date, account, exchange));
        tradeEvent.spentChunks = [...chunks]; // Assumes chunks are never modified.. Is this safe?
      }

      for (const input of Object.entries(inputs)) {
        const asset = input[0] as Assets;
        const quantity = input[1] as DecimalString;
        const chunks = [
          state.receiveChunk(asset, quantity, transaction.date, chunksOut.map(c => c.index)),
        ];
        chunks.forEach(chunk => state.putChunk(account, chunk));
        // TODO: What if trades cross jurisdictions?
        events.push(...emitJurisdictionChange(
          asset as Assets,
          quantity as DecimalString,
          swapsIn[0].from,
          swapsIn[0].to,
          transaction,
          chunks
        ));
      }

      tradeEvent.newBalances = { [account]: {} };
      for (const asset of rmDups(
        Object.keys(inputs).concat(Object.keys(outputs))
      ) as Assets[]) {
        tradeEvent.newBalances[account][asset] =
          state.getBalance(account, asset);
      }
      events.push(tradeEvent);

    // If no matching swaps, process them like normal transfers
    } else {
      if (swapsIn.length) {
        log.warn(swapsIn, `Can't find matching swaps out`);
      } else if (swapsOut.length){
        log.warn(swapsOut, `Can't find matching swaps in`);
      }
      swapsIn.forEach(handleTransfer);
      swapsOut.forEach(handleTransfer);
    }

    ////////////////////////////////////////

    state.touch(transaction.date);
    return [state.toJson(), events];
  };
};
