import {
  AddressBook,
  Assets,
  Cryptocurrencies,
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
import { getLogger, math } from "@finances/utils";

import { getStateFns } from "./state";
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

    const date = transaction.date;
    const events = [] as Event[];
    const state = getStateFns({ stateJson: oldState, addressBook, logger, events, date });
    log.debug(`Processing transaction ${transaction.index} from ${date}: ${
      transaction.description
    }`);

    const handleTransfer = (
      transfer: Transfer,
    ): void => {

      const getTransferEvents = (
        transfer: Transfer,
        transaction: Transaction,
      ): Events => {
        const { getName } = addressBook;
        const { asset, category, from, quantity, to } = transfer;
        // Skip tx fees for now, too much noise
        if (category === Expense && Object.keys(Cryptocurrencies).includes(to)) return [];
        const amt = round(quantity);
        const newEvent = {
          asset: asset,
          category,
          date,
          description: `${category} of ${amt} ${asset}`,
          from: from,
          quantity,
          tags: transaction.tags,
          to: to,
          type: EventTypes.Transfer,
        } as Event;
        newEvent.newBalances = {};
        if (([
          Internal, Deposit, Withdraw, Expense, SwapOut, Repay
        ] as TransferCategory[]).includes(category)) {
          newEvent.newBalances[from] = { [asset]: state.getBalance(from, asset) };
          newEvent.description += ` from ${getName(from)}`;
        }
        if (([
          Internal, Deposit, Withdraw, Income, SwapIn, Borrow
        ] as TransferCategory[]).includes(category)) {
          newEvent.newBalances[to] = { [asset]: state.getBalance(to, asset) };
          newEvent.description += ` to ${getName(to)}`;
        }
        const events = [newEvent];
        return events;
      };

      const { asset, category, from, quantity, to } = transfer;
      // Move funds from one account to another
      if (([Internal, Deposit, Withdraw] as TransferCategory[]).includes(category)) {
        state.moveValue(quantity, asset, from, to);
        events.push(...getTransferEvents(transfer, transaction));
      // Send funds out of our accounts
      } else if (([Expense, SwapOut, Repay] as TransferCategory[]).includes(category)) {
        state.disposeValue(quantity, asset, from);
        events.push(...getTransferEvents(transfer, transaction));
      // Receive funds into one of our accounts
      } else if (([Income, SwapIn, Borrow] as TransferCategory[]).includes(category)) {
        state.receiveValue(quantity, asset, to);
        events.push(...getTransferEvents(transfer, transaction));
      } else {
        log.warn(transfer, `idk how to process this transfer`);
      }
    };

    ////////////////////////////////////////
    // VM Core

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
        date,
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
      tradeEvent.account = account;

      // Process trade
      state.tradeValue(account, inputs, outputs);

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

    return [state.getJson(), events];
  };
};
