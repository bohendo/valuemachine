import * as fs from "fs";

import { getTransactions as getCoreTransactions } from "@finances/core";
import {
  AddressBook,
  ChainData,
  Logger,
  Store,
  Transaction,
} from "@finances/types";

export const getTransactions = async (
  addressBook: AddressBook,
  chainData: ChainData,
  store: Store,
  extraTransactions: Array<Transaction | string>,
  logger: Logger = console,
): Promise<Transaction[]> => {

  const transactions = getCoreTransactions({ addressBook, store, logger });

  transactions.mergeChainData(
    chainData.getAddressHistory(...addressBook.addresses.filter(addressBook.isSelf))
  );

  for (const source of extraTransactions || []) {
    if (typeof source === "string" && source.endsWith(".csv")) {
      if (source.toLowerCase().includes("coinbase")) {
        transactions.mergeCoinbase(fs.readFileSync(source, "utf8"));
      } else if (source.toLowerCase().includes("digital-ocean")) {
        transactions.mergeDigitalOcean(fs.readFileSync(source, "utf8"));
      } else if (source.toLowerCase().includes("wyre")) {
        transactions.mergeWyre(fs.readFileSync(source, "utf8"));
      } else if (source.toLowerCase().includes("wazrix")) {
        transactions.mergeWazrix(fs.readFileSync(source, "utf8"));
      } else {
        throw new Error(`I don't know how to parse transactions from ${source}`);
      }
    } else if (typeof source !== "string") {
      transactions.mergeTransaction(source);
    }
  }

  return transactions.json;
};

