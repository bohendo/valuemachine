import {
  Address,
  AddressBook,
  AssetChunk,
  AssetTypes,
  Transaction,
  Events,
  EventTypes,
  State,
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
    prices: transaction.prices,
    type: EventTypes.NetWorth,
  });
  return events;
};

export const emitTransferEvents = (
  addressBook: AddressBook,
  chunks: AssetChunk[],
  transaction: Transaction,
  transfer: Transfer,
): Events => {
  const { isSelf, getName } = addressBook;
  const events = [];
  const unitOfAccount = ["DAI", "SAI", "USD"];
  const { assetType, category, from, quantity, to } = transfer;
  const position = `#${transaction.index || "?"}${transfer.index ? `.${transfer.index}` : "" }`;

  const isAnySelf = (address: Address): boolean => isSelf(address) || address.endsWith("-account");

  const newEvent = {
    assetPrice: transaction.prices[assetType],
    assetType: assetType,
    date: transaction.date,
    description: `${round(quantity)} ${assetType} to ${getName(to)} ${position}`,
    quantity,
    type: category as EventTypes,
  } as any;

  if (["Borrow", "Burn", "GiftOut", "Income", "SwapIn", "Withdraw"].includes(category)) {
    newEvent.from = addressBook.getName(from);
  } else if (["Deposit", "Expense", "GiftIn", "Mint", "Repay", "SwapOut"].includes(category)) {
    newEvent.to = addressBook.getName(to);
  }

  if (["Income", "Expense"].includes(category)) {
    newEvent.taxTags = transaction.tags;
  }

  events.push(newEvent);

  if (isAnySelf(from) && !isAnySelf(to) && gt(transfer.quantity, "0")) {
    // maybe emit capital gain logs
    if (
      !unitOfAccount.includes(assetType) &&
      Object.keys(AssetTypes).includes(assetType) &&
      category === TransferCategories.SwapOut
    ) {
      chunks.forEach(chunk => {
        events.push({
          assetPrice: transaction.prices[chunk.assetType],
          assetType: chunk.assetType,
          date: transaction.date,
          description: `${round(chunk.quantity, 4)} ${chunk.assetType} ${position}`,
          purchaseDate: chunk.dateRecieved,
          purchasePrice: chunk.purchasePrice,
          quantity: chunk.quantity,
          type: EventTypes.CapitalGains,
        });
      });
    }
  }

  return events;
};
