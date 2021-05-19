import {
  AddressBook,
  AddressCategories,
  AssetChunk,
  Events,
  EventTypes,
  FiatAssets,
  Logger,
  Prices,
  State,
  Transaction,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { getLogger, math } from "@finances/utils";

import { rmDups } from "./transactions/utils";

const { add, eq, gt, mul, round  } = math;

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
    const assetsOut = rmDups(swapsOut.map(swap => swap.assetType));
    const assetsIn = rmDups(
      swapsIn
        .map(swap => swap.assetType)
        // If some input asset was refunded, remove this from the output asset list
        .filter(asset => !assetsOut.includes(asset))
    );
    const amtsOut = assetsOut.map(asset =>
      swapsIn
        .filter(swap => swap.assetType === asset)
        .map(swap => ({ ...swap, quantity: mul(swap.quantity, "-1") })) // subtract refunds
        .concat(
          swapsOut.filter(swap => swap.assetType === asset)
        ).reduce(sum, "0")
    );
    const amtsIn = assetsIn.map(asset =>
      swapsIn.filter(swap => swap.assetType === asset).reduce(sum, "0")
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
      prices: transaction.prices || {},
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
): Events => {
  const { getName } = addressBook;
  const events = [];
  const { assetType, category, from, quantity, to } = transfer;
  if (eq(quantity, "0")) {
    return events;
  }
  const position = `#${transaction.index || "?"}${transfer.index ? `.${transfer.index}` : "" }`;
  const taxTags = [];
  const shouldIgnore = addressBook.isCategory(AddressCategories.Ignore);
  if (shouldIgnore(transfer.to) || shouldIgnore(transfer.from)) {
    taxTags.push("ignore");
  }

  const newEvent = {
    assetPrice: prices.getPrice(transaction.date, assetType),
    assetType: assetType,
    date: transaction.date,
    description: `${round(quantity)} ${assetType} to ${getName(to)} ${position}`,
    quantity,
    type: category as EventTypes,
  } as any;

  if (["Income", "Expense"].includes(category)) {
    if (["Income"].includes(category)) {
      newEvent.from = addressBook.getName(from);
    } else if (["Expense"].includes(category)) {
      newEvent.to = addressBook.getName(to);
    }
    newEvent.taxTags = taxTags.concat(...transaction.tags);
    if (
      newEvent.to && (
        addressBook.isCategory(AddressCategories.Exchange)(newEvent.to)  ||
        newEvent.to.endsWith("exchange")
      )
    ) {
      newEvent.taxTags = taxTags.concat("exchange-fee");
    }
    events.push(newEvent);
  }

  if (
    gt(transfer.quantity, "0")
    && category === TransferCategories.SwapOut
    && transaction.transfers.length >= 2
  ) {
    const soldFor = transaction.transfers.find(t => (
      t.category === TransferCategories.SwapIn && Object.keys(FiatAssets).includes(t.assetType)
    ))?.assetType;
    if (soldFor) {
      chunks.forEach(chunk => {
        events.push({
          assetPrice: prices.getPrice(transaction.date, chunk.assetType),
          assetType: chunk.assetType,
          date: transaction.date,
          description: `${round(chunk.quantity, 4)} ${chunk.assetType} ${position}`,
          purchaseDate: chunk.dateRecieved,
          purchasePrice: chunk.purchasePrice,
          quantity: chunk.quantity,
          soldFor,
          type: EventTypes.CapitalGains,
        });
      });
    }
  }

  return events;
};
