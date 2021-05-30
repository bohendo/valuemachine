import {
  AddressBook,
  AddressCategories,
  AssetChunk,
  Assets,
  Events,
  EventTypes,
  Prices,
  Transaction,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { math } from "@finances/utils";

const { eq, round  } = math;
const { Income, Expense, Deposit, Withdraw, Borrow, Repay } = TransferCategories;

export const emitTransferEvents = (
  addressBook: AddressBook,
  chunks: AssetChunk[],
  transaction: Transaction,
  transfer: Transfer,
  prices: Prices,
  unit: Assets = Assets.ETH,
): Events => {
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

  if (category === Income) {
    newEvent.from = from;
    newEvent.description = `Recieved ${round(quantity)} ${asset} from ${getName(from)} `;
    events.push(newEvent);

  } else if (category === Expense) {
    newEvent.to = to;
    newEvent.description = `Paid ${round(quantity)} ${asset} to ${getName(to)} `;
    events.push(newEvent);

  } else if (category === Borrow) {
    newEvent.from = from;
    newEvent.description = `Borrowed ${round(quantity)} ${asset} from ${getName(from)} `;
    events.push(newEvent);

  } else if (category === Repay) {
    newEvent.to = to;
    newEvent.description = `Repaied ${round(quantity)} ${asset} to ${getName(to)} `;
    events.push(newEvent);

  } else if (category === Deposit) {
    newEvent.to = to;
    newEvent.description = `Deposited ${round(quantity)} ${asset} to ${getName(to)} `;
    events.push(newEvent);

  } else if (category === Withdraw) {
    newEvent.from = from;
    newEvent.description = `Withdrew ${round(quantity)} ${asset} from ${getName(from)} `;
    events.push(newEvent);

  }

  return events;
};
