import { hexlify, hexZeroPad } from "@ethersproject/bytes";
import {
  AddressBook,
  Asset,
  Balances,
  Guard,
  Transaction,
  Transfer,
  Value,
  TransferCategories,
} from "@valuemachine/types";
import {
  describeBalance,
  diffBalances,
  math,
  sumValue,
} from "@valuemachine/utils";

import { Assets, Guards, Methods } from "./enums";

const {
  Fee, Income, Expense, SwapIn, SwapOut, Refund, Borrow, Repay, Internal,
} = TransferCategories;

export const sumTransfers = (transfers: Transfer[]): Balances => sumValue(transfers as Value[]);

export const describeTransaction = (addressBook: AddressBook, tx: Transaction): string => {
  const fees = tx.transfers.filter(t => t.category === Fee);
  const nonFee = tx.transfers.filter(t => t.category !== Fee);
  if (!nonFee.length) {
    return `${tx.method || "Unknown method"} by ${addressBook.getName(fees[0].from, true)}`;

  } else if (nonFee.some(t => t.category === SwapIn) && nonFee.some(t => t.category === SwapOut)) {
    const [inputs, outputs] = diffBalances([sumTransfers(
      nonFee.filter(t => t.category === SwapIn || t.category === Refund)
    ), sumTransfers(
      nonFee.filter(t => t.category === SwapOut)
    )]);
    return `${addressBook.getName(
      nonFee.find(t => t.category === SwapOut).from,
      true,
    )} traded ${describeBalance(outputs)} for ${describeBalance(inputs)}`;

  } else if (nonFee.some(t => t.category === Borrow)) {
    return `${
      addressBook.getName(nonFee.find(t => t.category === Borrow).to, true)
    } borrowed ${
      describeBalance(sumTransfers(nonFee.filter(t => t.category === Borrow)))
    }${nonFee.length > 1 ? ", etc" : ""}`;

  } else if (nonFee.some(t => t.category === Repay)) {
    return `${
      addressBook.getName(nonFee.find(t => t.category === Repay).from, true)
    } repayed ${
      describeBalance(sumTransfers(nonFee.filter(t => t.category === Repay)))
    }${nonFee.length > 1 ? ", etc" : ""}`;

  } else if (nonFee.some(t => t.category === Income)) {
    return `${
      addressBook.getName(nonFee.find(t => t.category === Income).to, true)
    } received ${
      describeBalance(sumTransfers(nonFee.filter(t => t.category === Income)))
    }${nonFee.length > 1 ? ", etc" : ""}`;

  } else if (nonFee.some(t => t.category === Expense)) {
    return `${
      addressBook.getName(nonFee.find(t => t.category === Expense).from, true)
    } spent ${
      describeBalance(sumTransfers(nonFee.filter(t => t.category === Expense)))
    }${nonFee.length > 1 ? ", etc" : ""}`;

  } else if (nonFee.some(t => t.category === Internal)) {
    const transfer = nonFee.find(t => t.category === Internal);
    return `${tx.method || "Transfer"} of ${
      math.round(transfer.amount)} ${transfer.asset
    } from ${
      addressBook.getName(transfer.from, true)
    } to ${
      addressBook.getName(transfer.to, true)
    }${nonFee.length > 1 ? ", etc" : ""}`;

  } else if (tx.method) {
    return `${tx.method} by ${addressBook.getName(
      addressBook.isSelf(tx.transfers[0].to) ? tx.transfers[0].to : tx.transfers[0].from,
      true,
    )}`;

  } else {
    return `Unknown method by ${addressBook.getName(
      addressBook.isSelf(tx.transfers[0].to) ? tx.transfers[0].to : tx.transfers[0].from,
      true,
    )}`;
  }
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
  method: Methods.Unknown,
  sources: [],
  apps: [],
  tag: {},
  transfers: transfers || [],
});
