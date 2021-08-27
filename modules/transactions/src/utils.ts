import { isHexString, hexDataLength } from "@ethersproject/bytes";
import {
  Asset,
  Guards,
  Guard,
  AddressBook,
  Transaction,
} from "@valuemachine/types";

import { Assets } from "./assets";

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
