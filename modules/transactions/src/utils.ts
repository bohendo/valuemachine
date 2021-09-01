import { hexDataLength, hexlify, hexZeroPad, isHexString } from "@ethersproject/bytes";
import {
  AddressBook,
  Asset,
  Guard,
  Transaction,
  Transfer,
} from "@valuemachine/types";

import { Assets, Guards } from "./enums";

export const describeTransaction = (addressBook: AddressBook, tx: Transaction): string => {
  return `${tx.method || "Method Call"} by ${addressBook.getName(
    addressBook.isSelf(tx.transfers[0].to) ? tx.transfers[0].to : tx.transfers[0].from
  )}`;
};

export const isHash = (str: string): boolean => isHexString(str) && hexDataLength(str) === 32;

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
  hash: hexZeroPad(hexlify(txIndex), 32),
  index: txIndex++,
  sources: [],
  apps: [],
  transfers: transfers || [],
});
