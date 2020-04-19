import {
  Address,
  AssetChunk,
  Event,
  TransferCategories,
  Logs,
  LogTypes,
  Transfer,
} from "@finances/types";
import { AddressZero } from "ethers/constants";

import { AddressBook, State } from "./types";
import { eq, mul, round, sub } from "./utils";

export const emitEventLogs = (
  addressBook: AddressBook,
  event: Event,
  state: State,
) => {
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
  const { isSelf, pretty } = addressBook;
  const logs = [];
  const unitOfAccount = ["DAI", "SAI", "USD"];
  const { assetType, from, quantity, to } = transfer;
  const position = `#${event.index || "?"}${transfer.index ? `.${transfer.index}` : "" }`;
  const wethAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

  const isAnySelf = (address: Address): boolean => isSelf(address) || address.endsWith("account");

  if (["Borrow", "Burn", "Income", "SwapIn", "Withdraw"].includes(transfer.category)) {
    logs.push({
      assetPrice: event.prices[assetType],
      assetType: assetType,
      date: event.date,
      description: `${quantity} ${assetType} to ${pretty(to)} ${position}`,
      quantity: quantity,
      from,
      type: transfer.category as LogTypes,
    });
  } else if (["Deposit", "Expense", "Mint", "Repay", "SwapOut"].includes(transfer.category)) {
    logs.push({
      assetPrice: event.prices[assetType],
      assetType: assetType,
      date: event.date,
      description: `${quantity} ${assetType} to ${pretty(to)} ${position}`,
      quantity: quantity,
      to,
      type: transfer.category as LogTypes,
    });
  }

  if (isAnySelf(from) && !isAnySelf(to)) {
    // maybe emit expense/gift
    if (transfer.category === TransferCategories.Transfer) {
      logs.push({
        assetPrice: event.prices[assetType],
        assetType: assetType,
        date: event.date,
        description: `${quantity} ${assetType} to ${pretty(to)} ${position}`,
        quantity: quantity,
        to,
        type: LogTypes.Expense,
      });
    } else if (transfer.category === TransferCategories.Gift) {
      logs.push({
        assetPrice: event.prices[assetType],
        assetType: assetType,
        date: event.date,
        description: `${quantity} ${assetType} to ${pretty(to)} ${position}`,
        quantity: quantity,
        to,
        type: LogTypes.GiftOut,
      });
    }

    // maybe emit capital gain logs
    if (!unitOfAccount.includes(assetType) && transfer.category === TransferCategories.SwapOut) {
      chunks.forEach(chunk => {
        const cost = mul(chunk.purchasePrice, chunk.quantity);
        const proceeds = mul(event.prices[chunk.assetType], chunk.quantity);
        logs.push({
          cost,
          date: event.date,
          dateRecieved: chunk.dateRecieved,
          description: `${round(chunk.quantity, 4)} ${chunk.assetType} ${position}`,
          gainOrLoss: sub(proceeds, cost),
          proceeds,
          type: LogTypes.CapitalGains,
        });
      });
    }

  // maybe emit income/gift log
  } else if (!isAnySelf(from) && isAnySelf(to)) {
    if (transfer.category === TransferCategories.Transfer) {
      logs.push({
        assetPrice: event.prices[assetType],
        assetType: assetType,
        date: event.date,
        description: `${quantity} ${assetType} from ${pretty(from)} ${position}`,
        from,
        quantity: quantity,
        type: LogTypes.Income,
      });
    } else if (transfer.category === TransferCategories.Gift) {
      logs.push({
        assetPrice: event.prices[assetType],
        assetType: assetType,
        date: event.date,
        description: `${quantity} ${assetType} to ${pretty(to)} ${position}`,
        quantity: quantity,
        to,
        type: LogTypes.GiftOut,
      });
    }
  }

  return logs;
};
