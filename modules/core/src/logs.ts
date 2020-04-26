import {
  Address,
  AddressBook,
  AssetChunk,
  Event,
  Logs,
  LogTypes,
  State,
  Transfer,
  TransferCategories,
} from "@finances/types";

import { gt, round } from "./utils";

export const emitEventLogs = (
  addressBook: AddressBook,
  event: Event,
  state: State,
): Logs => {
  const logs = [];
  logs.push({
    assets: state.getNetWorth(),
    date: event.date,
    prices: event.prices,
    type: LogTypes.NetWorth,
  });
  return logs;
};

export const emitTransferLogs = (
  addressBook: AddressBook,
  chunks: AssetChunk[],
  event: Event,
  transfer: Transfer,
): Logs => {
  const { isSelf, getName } = addressBook;
  const logs = [];
  const unitOfAccount = ["DAI", "SAI", "USD"];
  const { assetType, from, quantity, to } = transfer;
  const position = `#${event.index || "?"}${transfer.index ? `.${transfer.index}` : "" }`;

  const isAnySelf = (address: Address): boolean => isSelf(address) || address.endsWith("account");

  if (["Borrow", "Burn", "Income", "SwapIn", "Withdraw"].includes(transfer.category)) {
    logs.push({
      assetPrice: event.prices[assetType],
      assetType: assetType,
      date: event.date,
      description: `${quantity} ${assetType} to ${getName(to)} ${position}`,
      from,
      quantity,
      type: transfer.category as LogTypes,
    });
  } else if (["Deposit", "Expense", "Mint", "Repay", "SwapOut"].includes(transfer.category)) {
    logs.push({
      assetPrice: event.prices[assetType],
      assetType: assetType,
      date: event.date,
      description: `${quantity} ${assetType} to ${getName(to)} ${position}`,
      quantity,
      to,
      type: transfer.category as LogTypes,
    });
  }

  if (isAnySelf(from) && !isAnySelf(to) && gt(transfer.quantity, "0")) {
    // maybe emit expense/gift
    if (transfer.category === TransferCategories.Transfer) {
      logs.push({
        assetPrice: event.prices[assetType],
        assetType: assetType,
        date: event.date,
        description: `${quantity} ${assetType} to ${getName(to)} ${position}`,
        quantity,
        to,
        type: LogTypes.Expense,
      });
    } else if (transfer.category === TransferCategories.Gift) {
      logs.push({
        assetPrice: event.prices[assetType],
        assetType: assetType,
        date: event.date,
        description: `${quantity} ${assetType} to ${getName(to)} ${position}`,
        quantity,
        to,
        type: LogTypes.GiftOut,
      });
    }

    // maybe emit capital gain logs
    if (!unitOfAccount.includes(assetType) && transfer.category === TransferCategories.SwapOut) {
      chunks.forEach(chunk => {
        logs.push({
          assetPrice: event.prices[chunk.assetType],
          assetType: chunk.assetType,
          date: event.date,
          description: `${round(chunk.quantity, 4)} ${chunk.assetType} ${position}`,
          purchaseDate: chunk.dateRecieved,
          purchasePrice: chunk.purchasePrice,
          quantity,
          type: LogTypes.CapitalGains,
        });
      });
    }

  // maybe emit income/gift log
  } else if (!isAnySelf(from) && isAnySelf(to) && gt(transfer.quantity, "0")) {
    if (transfer.category === TransferCategories.Transfer) {
      logs.push({
        assetPrice: event.prices[assetType],
        assetType: assetType,
        date: event.date,
        description: `${quantity} ${assetType} from ${getName(from)} ${position}`,
        from,
        quantity: quantity,
        type: LogTypes.Income,
      });
    } else if (transfer.category === TransferCategories.Gift) {
      logs.push({
        assetPrice: event.prices[assetType],
        assetType: assetType,
        date: event.date,
        description: `${quantity} ${assetType} to ${getName(to)} ${position}`,
        quantity: quantity,
        to,
        type: LogTypes.GiftOut,
      });
    }
  }

  return logs;
};
