import {
  TransactionParams,
  TransactionsJson,
  ChainData,
  StoreKeys,
  Transaction,
  Transactions,
} from "@finances/types";
import { getLogger } from "@finances/utils";

import { getTransactionsError } from "../verify";

import { mergeEthTransactions } from "./eth";
import {
  mergeCoinbaseTransactions,
  mergeDigitalOceanTransactions,
  mergeWazrixTransactions,
  mergeWyreTransactions,
} from "./external";
import { mergeDefaultTransactions } from "./utils";

// Note: we must import chain data before off-chain stuff to ensure merges work properly
export const getTransactions = ({
  addressBook,
  logger,
  store,
  transactionsJson,
}: TransactionParams): Transactions => {
  const log = (logger || getLogger()).child({ module: "Transactions" });

  let txns = transactionsJson || (store ? store.load(StoreKeys.Transactions) : []);

  const getLastUpdated = () =>
    txns.length !== 0 ? new Date(txns[txns.length - 1].date).getTime() : 0;

  log.info(`Loaded ${txns.length} transactions from ${
    transactionsJson ? "input" : store ? "store" : "default"
  }, most recent was on ${getLastUpdated()}`);

  ////////////////////////////////////////
  // Internal Helper Methods

  const sync = () => {
    // A non-zero allowableTimeDiff for exchange merges causes edge cases while insert-sorting
    // This edge case is tricky to solve at source, just sort manually instead
    txns = txns.sort((e1: Transaction, e2: Transaction): number =>
      new Date(e1.date).getTime() - new Date(e2.date).getTime(),
    );
    // Reset Indicies
    let i = 1;
    txns.forEach(transaction => transaction.index = i++);
    // Validate
    const error = getTransactionsError(txns);
    if (error) {
      throw new Error(error);
    } else {
      log.debug("All transactions have been validated");
    }
    if (store) {
      // Save to store
      log.info(`Saving ${txns.length} transactions to storage`);
      store.save(StoreKeys.Transactions, txns);
    }
  };

  ////////////////////////////////////////
  // Exported Methods

  const getParams = () => ({
    addressBook,
    logger,
    store,
    transactionsJson: txns,
  });

  const mergeChainData = async (chainData: ChainData): Promise<void> => {
    log.info(`Merging chain data containing ${chainData.json.transactions.length} txns`);
    txns = mergeEthTransactions(txns, addressBook, chainData, 0, log);
    sync();
  };

  const mergeCoinbase = async (csvData: string): Promise<void> => {
    txns = mergeCoinbaseTransactions(txns, csvData, log);
    sync();
  };

  const mergeDigitalOcean = async (csvData: string): Promise<void> => {
    txns = mergeDigitalOceanTransactions(txns, csvData, log);
    sync();
  };

  const mergeWazrix = async (csvData: string): Promise<void> => {
    txns = mergeWazrixTransactions(txns, csvData, log);
    sync();
  };

  const mergeWyre = async (csvData: string): Promise<void> => {
    txns = mergeWyreTransactions(txns, csvData, log);
    sync();
  };

  const mergeTransactions = async (transactions: TransactionsJson): Promise<void> => {
    transactions.forEach(tx => {
      txns = mergeDefaultTransactions(txns, tx);
    });
    sync();
  };

  const mergeTransaction = async (transaction: Partial<Transaction>): Promise<void> => {
    txns = mergeDefaultTransactions(txns, transaction);
    sync();
  };

  return {
    getAll: () => txns,
    getParams,
    mergeChainData,
    mergeCoinbase,
    mergeDigitalOcean,
    mergeTransaction,
    mergeTransactions,
    mergeWazrix,
    mergeWyre,
  };

};
