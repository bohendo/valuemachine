import {
  AddressBook,
  AssetChunk,
  Event,
  Logs,
  LogTypes,
  Transfer,
} from "./types";
import { mul, round, sub } from "./utils";

export const emitLogs = (
  addressBook: AddressBook,
  chunks: AssetChunk[],
  event: Event,
  transfer: Transfer,
): Logs => {
  const { isSelf, pretty } = addressBook;
  const { from, to } = transfer;
  const logs = [];

  // maybe emit capital gain logs
  if (isSelf(from) && !isSelf(to)) {
    logs.push({
      assetPrice: event.prices[transfer.assetType],
      assetType: transfer.assetType,
      date: event.date,
      description: `${transfer.quantity} ${transfer.assetType} to ${pretty(to)}`,
      quantity: transfer.quantity,
      to,
      type: LogTypes.Expense,
    });

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

  if (!isSelf(from) && isSelf(to)) {
    logs.push({
      assetPrice: event.prices[transfer.assetType],
      assetType: transfer.assetType,
      date: event.date,
      description: `${transfer.quantity} ${transfer.assetType} from ${pretty(from)}`,
      from,
      quantity: transfer.quantity,
      type: LogTypes.Income,
    });
  }

  return logs;
};
