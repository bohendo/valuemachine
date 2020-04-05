import { AddressZero } from "ethers/constants";

import {
  AddressBook,
  AssetChunk,
  Event,
  EventTags,
  Logs,
  LogTypes,
  Transfer,
} from "./types";
import { eq, mul, round, sub } from "./utils";

export const emitLogs = (
  addressBook: AddressBook,
  chunks: AssetChunk[],
  event: Event,
  transfer: Transfer,
): Logs => {
  const { isSelf, pretty } = addressBook;
  const logs = [];
  const unitOfAccount = ["DAI", "SAI", "USD"];

  if (transfer.from === AddressZero || transfer.to === AddressZero || eq(transfer.quantity, "0")) {
    return logs;
  }

  if (isSelf(transfer.from) && !isSelf(transfer.to)) {

    // maybe emit expense
    if (!event.tags.includes(EventTags.Trade)) {
      logs.push({
        assetPrice: event.prices[transfer.assetType],
        assetType: transfer.assetType,
        date: event.date,
        description: `${transfer.quantity} ${transfer.assetType} to ${pretty(transfer.to)}`,
        quantity: transfer.quantity,
        to: transfer.to,
        type: LogTypes.Expense,
      });
      }

    // maybe emit capital gain logs
    if (!unitOfAccount.includes(transfer.assetType)) {
      chunks.forEach(chunk => {
        const cost = mul(chunk.purchasePrice, chunk.quantity);
        const proceeds = mul(event.prices[chunk.assetType], chunk.quantity);
        logs.push({
          cost,
          date: event.date,
          dateRecieved: chunk.dateRecieved,
          description: `${round(chunk.quantity, 4)} ${chunk.assetType}`,
          gainOrLoss: sub(proceeds, cost),
          proceeds,
          type: LogTypes.CapitalGains,
        });
      });
    }
  }

  // maybe emit income log
  if (
    !isSelf(transfer.from) &&
    isSelf(transfer.to) &&
    (true /* isn't a from weth eg during withdraw */)
  ) {
    logs.push({
      assetPrice: event.prices[transfer.assetType],
      assetType: transfer.assetType,
      date: event.date,
      description: `${transfer.quantity} ${transfer.assetType} from ${pretty(transfer.from)}`,
      from: transfer.from,
      quantity: transfer.quantity,
      type: LogTypes.Income,
    });
  }

  return logs;
};
