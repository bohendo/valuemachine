import { AddressBook, ILogger, ChainData, Transaction } from "@finances/types";

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
  lastUpdated: number = 0,
  logger?: ILogger,
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
