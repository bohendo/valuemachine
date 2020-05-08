import { AddressBook, Logger, ChainData, Transaction } from "@finances/types";

import { mergeEthTxTransactions } from "./ethTx";
import { mergeEthCallTransactions } from "./ethCall";

export { mergeCoinbaseTransactions } from "./coinbase";
export { mergeDigitalOceanTransactions } from "./digitalocean";
export { mergeWyreTransactions } from "./wyre";
export { mergeDefaultTransactions } from "./utils";

export const mergeEthTransactions = (
  oldTransactions: Transaction[],
  addressBook: AddressBook,
  chainData: ChainData,
  lastUpdated = 0,
  logger?: Logger,
): Transaction[] => {
  let transactions = JSON.parse(JSON.stringify(oldTransactions));

  transactions = mergeEthTxTransactions(
    transactions,
    addressBook,
    chainData,
    lastUpdated,
    logger,
  );

  transactions = mergeEthCallTransactions(
    transactions,
    addressBook,
    chainData,
    lastUpdated,
    logger,
  );

  return transactions;
};
