import { AddressZero } from "ethers/constants";

import {
  AddressBook,
  AssetChunk,
  Event,
  TransferTags,
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
  const { assetType, from, quantity, to } = transfer;
  const position = `#${event.index || "?"}${transfer.index ? `.${transfer.index}` : "" }`;
  const wethAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

  if (
    from === AddressZero || to === AddressZero ||
    from === wethAddress || to === wethAddress ||
    eq(quantity, "0")
  ) {
    return logs;
  }

  if (isSelf(from) && !isSelf(to)) {

    // maybe emit expense
    if (!event.tags.includes(TransferTags.SwapOut)) {
      logs.push({
        assetPrice: event.prices[assetType],
        assetType: assetType,
        date: event.date,
        description: `${quantity} ${assetType} to ${pretty(to)} ${position}`,
        quantity: quantity,
        to,
        type: LogTypes.Expense,
      });
      }

    // maybe emit capital gain logs
    if (!unitOfAccount.includes(assetType) && event.tags.includes(TransferTags.SwapOut)) {
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
  }

  // maybe emit income log
  if (
    !isSelf(from) &&
    isSelf(to) &&
    !event.tags.includes(TransferTags.SwapIn)
  ) {
    logs.push({
      assetPrice: event.prices[assetType],
      assetType: assetType,
      date: event.date,
      description: `${quantity} ${assetType} from ${pretty(from)} ${position}`,
      from,
      quantity: quantity,
      type: LogTypes.Income,
    });
  }

  return logs;
};
