import {
  AddressBook,
  AddressCategories,
  AssetChunk,
  EventTypes,
  Events,
  FiatAssets,
  Prices,
  State,
  Transaction,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { math } from "@finances/utils";

const { gt, round } = math;

export const emitTransactionEvents = (
  addressBook: AddressBook,
  transaction: Transaction,
  state: State,
): Events => {
  const events = [];
  events.push({
    assets: state.getNetWorth(),
    date: transaction.date,
    type: EventTypes.NetWorth,
  });
  // Add swap event
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
