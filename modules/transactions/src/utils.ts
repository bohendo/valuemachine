import { hexlify, hexZeroPad } from "@ethersproject/bytes";
import {
  AddressBook,
  Asset,
  Guard,
  Transaction,
  Transfer,
  TransferCategories,
} from "@valuemachine/types";
import { describeBalance, sumTransfers } from "@valuemachine/utils";

import { Assets, Guards } from "./enums";

const { Fee, Income, Expense, SwapIn, SwapOut } = TransferCategories;

export const describeTransaction = (addressBook: AddressBook, tx: Transaction): string => {
  const fees = tx.transfers.filter(t => t.category === Fee);
  const nonFee = tx.transfers.filter(t => t.category !== Fee);
  if (!nonFee.length) {
    return `${tx.method || "Unknown method call"} by ${addressBook.getName(fees[0].from)}`;

  } else if (nonFee.every(t => t.category === Income)) {
    return `${addressBook.getName(nonFee[0].to)}${nonFee.length > 1 ? ", etc" : ""} received ${
      describeBalance(sumTransfers(nonFee))
    }`;

  } else if (nonFee.every(t => t.category === Expense)) {
    return `${addressBook.getName(nonFee[0].from)}${nonFee.length > 1 ? ", etc" : ""} spent ${
      describeBalance(sumTransfers(nonFee))
    }`;

  } else if (nonFee.every(t => t.category === SwapIn || t.category === SwapOut)) {
    return `${addressBook.getName(
      nonFee[0].category === SwapIn ? nonFee[0].to : nonFee[0].from
    )} traded ${
      describeBalance(sumTransfers(nonFee.filter(t => t.category === SwapOut)))
    } for ${
      describeBalance(sumTransfers(nonFee.filter(t => t.category === SwapIn)))
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
