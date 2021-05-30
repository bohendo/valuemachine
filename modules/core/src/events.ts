import {
  AddressBook,
  AddressCategories,
  AssetChunk,
  Assets,
  Events,
  EventTypes,
  Logger,
  Prices,
  State,
  Transaction,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { getLogger, math } from "@finances/utils";

import { rmDups } from "./transactions/utils";

const { abs, add, eq, gt, mul, round, sigfigs, sub  } = math;

export const emitTransactionEvents = (
  addressBook: AddressBook,
  transaction: Transaction,
  state: State,
  logger?: Logger,
): Events => {
  const log = (logger || getLogger()).child({ module: "TransactionEvent" });
  const events = [];
  const networth = state.getNetWorth();
  if (!Object.keys(networth).length) return events;
  events.push({
    assets: state.getNetWorth(),
    date: transaction.date,
    type: EventTypes.NetWorth,
  });
  // Add trade event

  // Get swapsIn & swapsOut to determine each assetChunk's full history
  const swapsIn = transaction.transfers.filter(t => t.category === TransferCategories.SwapIn);
  const swapsOut = transaction.transfers.filter(t => t.category === TransferCategories.SwapOut);
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
    events.push({
      date: transaction.date,
      description: `Traded ${
        assetsOut.map((asset, i) => `${round(amtsOut[i])} ${asset}`).join(" & ")
      } for ${
        assetsIn.map((asset, i) => `${round(amtsIn[i])} ${asset}`).join(" & ")
      }`,
      swapsIn: inputs,
      swapsOut: outputs,
      type: EventTypes.Trade,
    });
  } else if (swapsIn.length && !swapsOut.length) {
    log.warn(swapsIn, `Can't find swaps out to match swaps in`);
  } else if (!swapsIn.length && swapsOut.length) {
    log.warn(swapsOut, `Can't find swaps in to match swaps out`);
  }

  return events;
};

export const emitTransferEvents = (
  addressBook: AddressBook,
  chunks: AssetChunk[],
  transaction: Transaction,
  transfer: Transfer,
  prices: Prices,
  unit: Assets = Assets.ETH,
  logger?: Logger,
): Events => {
  const log = (logger || getLogger()).child({ module: "TransferEvent" });
  const { getName } = addressBook;
  const events = [];
  const { asset, category, from, quantity, to } = transfer;
  if (eq(quantity, "0")) {
    return events;
  }
  const tags = [];
  const shouldIgnore = addressBook.isCategory(AddressCategories.Ignore);
  if (shouldIgnore(transfer.to) || shouldIgnore(transfer.from)) {
    tags.push("ignore");
  }

  const newEvent = {
    assetPrice: prices.getPrice(transaction.date, asset, unit),
    asset: asset,
    date: transaction.date,
    quantity,
    tags: transaction.tags,
    type: category as EventTypes,
  } as any;

  if (category === TransferCategories.Income) {
    newEvent.from = from;
    newEvent.description = `Recieved ${round(quantity)} ${asset} from ${getName(from)} `;
    events.push(newEvent);

  } else if (category === TransferCategories.Expense) {
    newEvent.to = to;
    newEvent.description = `Paid ${round(quantity)} ${asset} to ${getName(to)} `;
    events.push(newEvent);

  } else if (category === TransferCategories.Borrow) {
    newEvent.from = from;
    newEvent.description = `Borrowed ${round(quantity)} ${asset} from ${getName(from)} `;
    events.push(newEvent);

  } else if (category === TransferCategories.Repay) {
    newEvent.to = to;
    newEvent.description = `Repaied ${round(quantity)} ${asset} to ${getName(to)} `;
    events.push(newEvent);

  } else if (category === TransferCategories.Deposit) {
    newEvent.to = to;
    newEvent.description = `Deposited ${round(quantity)} ${asset} to ${getName(to)} `;
    events.push(newEvent);

  } else if (category === TransferCategories.Withdraw) {
    newEvent.from = from;
    newEvent.description = `Withdrew ${round(quantity)} ${asset} from ${getName(from)} `;
    events.push(newEvent);

  } else if (category === TransferCategories.SwapOut && gt(transfer.quantity, "0")) {
    chunks.forEach(chunk => {
      const currentPrice = prices.getPrice(transaction.date, chunk.asset, unit);
      if (!currentPrice) {
        log.warn(`Price in units of ${unit} is unavailable for ${asset} on ${transaction.date}`);
        return events;
      }
      const purchaseValue = mul(chunk.quantity, chunk.purchasePrice);
      const saleValue = mul(chunk.quantity, currentPrice);
      const change = sub(saleValue, purchaseValue); // is negative if capital loss
      const isGain = gt(change, "0");
      if (!eq(change, "0")) {
        events.push({
          assetPrice: currentPrice,
          asset: chunk.asset,
          date: transaction.date,
          description: `${round(chunk.quantity)} ${chunk.asset} ${
            isGain ? "gained" : "lost"
          } ${sigfigs(abs(change))} ${unit} of value since we got it on ${chunk.dateRecieved}`,
          change,
          purchaseDate: chunk.dateRecieved,
          purchasePrice: chunk.purchasePrice,
          quantity: chunk.quantity,
          type: isGain ? EventTypes.CapitalGains : EventTypes.CapitalLoss,
        });
      }
    });
  }

  return events;
};
