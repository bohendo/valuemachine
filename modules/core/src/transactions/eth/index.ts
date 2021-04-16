import { AddressBook, Logger, ChainData, Transaction } from "@finances/types";

import { mergeEthTxTransactions } from "./tx";
import { mergeEthCallTransactions } from "./call";

export const mergeEthTransactions = (
  oldTransactions: Transaction[],
  addressBook: AddressBook,
  chainData: ChainData,
  lastUpdated = 0,
  logger?: Logger,
): Transaction[] => {
  let transactions = JSON.parse(JSON.stringify(oldTransactions));
  const start = new Date().getTime();

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

  logger.info(`Processed ${chainData.json.transactions.length} txs & ${
    chainData.json.calls.length
  } calls in ${new Date().getTime() - start} ms`);

  return transactions;
};
