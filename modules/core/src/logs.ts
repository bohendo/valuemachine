import {
  Address,
  AddressBook,
  AssetChunk,
  AssetTypes,
  Event,
  Logs,
  LogTypes,
  State,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { math } from "@finances/utils";

const { gt, round } = math;

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

  const isAnySelf = (address: Address): boolean => isSelf(address) || address.endsWith("-account");

  if (["Borrow", "Burn", "GiftOut", "Income", "SwapIn", "Withdraw"].includes(transfer.category)) {
    logs.push({
      assetPrice: event.prices[assetType],
      assetType: assetType,
      date: event.date,
      description: `${round(quantity)} ${assetType} to ${getName(to)} ${position}`,
      from,
      quantity,
      type: transfer.category as LogTypes,
    });
  } else if (["Deposit", "Expense", "GiftIn", "Mint", "Repay", "SwapOut"].includes(transfer.category)) {
    logs.push({
      assetPrice: event.prices[assetType],
      assetType: assetType,
      date: event.date,
      description: `${round(quantity)} ${assetType} to ${getName(to)} ${position}`,
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
        description: `${round(quantity)} ${assetType} to ${getName(to)} ${position}`,
        quantity,
        taxTags: event.tags,
        to,
        type: LogTypes.Expense,
      });
    } else if (transfer.category === TransferCategories.GiftOut) {
      logs.push({
        assetPrice: event.prices[assetType],
        assetType: assetType,
        date: event.date,
        description: `${round(quantity)} ${assetType} to ${getName(to)} ${position}`,
        quantity,
        to,
        type: LogTypes.GiftOut,
      });
    }

    // maybe emit capital gain logs
    if (
      !unitOfAccount.includes(assetType) &&
      Object.keys(AssetTypes).includes(assetType) &&
      transfer.category === TransferCategories.SwapOut
    ) {
      chunks.forEach(chunk => {
        logs.push({
          assetPrice: event.prices[chunk.assetType],
          assetType: chunk.assetType,
          date: event.date,
          description: `${round(chunk.quantity, 4)} ${chunk.assetType} ${position}`,
          purchaseDate: chunk.dateRecieved,
          purchasePrice: chunk.purchasePrice,
          quantity: chunk.quantity,
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
        description: `${round(quantity)} ${assetType} from ${getName(from)} ${position}`,
        from,
        quantity: quantity,
        taxTags: event.tags,
        type: LogTypes.Income,
      });
    } else if (transfer.category === TransferCategories.GiftIn) {
      logs.push({
        assetPrice: event.prices[assetType],
        assetType: assetType,
        date: event.date,
        description: `${round(quantity)} ${assetType} to ${getName(to)} ${position}`,
        quantity: quantity,
        to,
        type: LogTypes.GiftIn,
      });
    }
  }

  return logs;
};
