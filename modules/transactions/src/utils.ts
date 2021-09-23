import { hexlify, hexZeroPad } from "@ethersproject/bytes";
import {
  AddressBook,
  Asset,
  Guard,
  Transaction,
  Transfer,
  TransferCategories,
} from "@valuemachine/types";
import { describeBalance, diffBalances, round, sumTransfers } from "@valuemachine/utils";

import { Assets, Guards } from "./enums";

const {
  Fee, Income, Expense, SwapIn, SwapOut, Refund, Borrow, Repay, Internal,
} = TransferCategories;

export const describeTransaction = (addressBook: AddressBook, tx: Transaction): string => {
  const fees = tx.transfers.filter(t => t.category === Fee);
  const nonFee = tx.transfers.filter(t => t.category !== Fee);
  if (!nonFee.length) {
    return `${tx.method || "Unknown method call"} by ${addressBook.getName(fees[0].from)}`;

  } else if (nonFee.some(t => t.category === SwapIn) && nonFee.some(t => t.category === SwapOut)) {
    const [inputs, outputs] = diffBalances([sumTransfers(
      nonFee.filter(t => t.category === SwapIn || t.category === Refund)
    ), sumTransfers(
      nonFee.filter(t => t.category === SwapOut)
    )]);
    return `${addressBook.getName(
      nonFee.find(t => t.category === SwapOut).from
    )} traded ${describeBalance(outputs)} for ${describeBalance(inputs)}`;

  } else if (nonFee.some(t => t.category === Income)) {
    return `${
      addressBook.getName(nonFee.find(t => t.category === Income).to)
    }${nonFee.length > 1 ? ", etc" : ""} received ${
      describeBalance(sumTransfers(nonFee.filter(t => t.category === Income)))
    }`;

  } else if (nonFee.some(t => t.category === Expense)) {
    return `${
      addressBook.getName(nonFee.find(t => t.category === Expense).from)
    }${nonFee.length > 1 ? ", etc" : ""} spent ${
      describeBalance(sumTransfers(nonFee.filter(t => t.category === Expense)))
    }`;

  } else if (nonFee.some(t => t.category === Borrow)) {
    return `${
      addressBook.getName(nonFee.find(t => t.category === Borrow).to)
    }${nonFee.length > 1 ? ", etc" : ""} borrowed ${
      describeBalance(sumTransfers(nonFee))
    }`;

  } else if (nonFee.some(t => t.category === Repay)) {
    return `${
      addressBook.getName(nonFee.find(t => t.category === Repay).from)
    }${nonFee.length > 1 ? ", etc" : ""} repayed ${
      describeBalance(sumTransfers(nonFee))
    }`;

  } else if (nonFee.some(t => t.category === Internal)) {
    const transfer = nonFee.find(t => t.category === Internal);
    return `${tx.method || "Transfer"}${nonFee.length > 1 ? ", etc" : ""} of ${
      round(transfer.amount)} ${transfer.asset
    } from ${
      addressBook.getName(transfer.from)
    } to ${
      addressBook.getName(transfer.to)
    }`;

  }
  return `${tx.method || "Unknown method call"} by ${addressBook.getName(
    addressBook.isSelf(tx.transfers[0].to) ? tx.transfers[0].to : tx.transfers[0].from
  )}`;
};

// Used to guess the network when depositing to/withdrawing from an exchange
// Ideally, the exchange would provide this info explicitly
export const getGuard = (asset: Asset): Guard =>
  asset === Assets.BTC ? Guards.Bitcoin
  : asset === Assets.BCH ? Guards.BitcoinCash
  : asset === Assets.LTC ? Guards.Litecoin
  : asset === Assets.ETC ? Guards.EthereumClassic
  : asset === Assets.USD ? Guards.USA
  : asset === Assets.CZK ? Guards.CZE
  : asset === Assets.GBP ? Guards.GBR
  : asset === Assets.INR ? Guards.IND
  : Guards.Ethereum;

let txIndex = 0;
export const getTestTx = (transfers: Transfer[]): Transaction => ({
  date: new Date(
    new Date("2020-01-01T01:00:00Z").getTime() + (txIndex * 24 * 60 * 60 * 1000)
  ).toISOString(),
  uuid: `Test/${hexZeroPad(hexlify(txIndex), 32)}`,
  index: txIndex++,
  sources: [],
  apps: [],
  transfers: transfers || [],
});
