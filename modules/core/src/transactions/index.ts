import {
  TransactionParams,
  AssetTypes,
  ChainData,
  StoreKeys,
  Transaction,
  Transactions,
} from "@finances/types";
import { getLogger } from "@finances/utils";

import { getPrices } from "../prices";
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
  const prices = getPrices({ store, logger });

  let txns = transactionsJson || (store ? store.load(StoreKeys.Transactions) : []);

  const getLastUpdated = () =>
    txns.length !== 0 ? new Date(txns[txns.length - 1].date).getTime() : 0;

  log.info(`Loaded ${txns.length} transactions from ${
    transactionsJson ? "input" : store ? "store" : "default"
  }, most recent was on ${getLastUpdated()}`);

  ////////////////////////////////////////
  // Internal Helper Methods

  const validate = () => {
    const error = getTransactionsError(txns);
    if (error) {
      throw new Error(error);
    } else {
      log.debug("All transactions have been validated");
    }
  };

  const sync = () => {
    // A non-zero allowableTimeDiff for exchange merges causes edge cases while insert-sorting
    // This edge case is tricky to solve at source, just sort manually instead
    txns = txns.sort((e1: Transaction, e2: Transaction): number =>
      new Date(e1.date).getTime() - new Date(e2.date).getTime(),
    );
    // Reset Indicies
    let i = 1;
    txns.forEach(transaction => transaction.index = i++);
    // Save to store
    log.info(`Saving ${txns.length} transactions to storage`);
    store.save(StoreKeys.Transactions, txns);
  };

  ////////////////////////////////////////
  // Exported Methods

  const getParams = () => ({
    addressBook,
    logger,
    store,
    transactionsJson: txns,
  });

  const syncPrices = async () => {
    // Attach Prices
    log.info(`Attaching price info to transactions`);
    for (let i = 0; i < txns.length; i++) {
      const transaction = txns[i];
      const assets = Array.from(new Set(transaction.transfers.map(a => a.assetType)));
      for (let j = 0; j < assets.length; j++) {
        const assetType = assets[j] as AssetTypes;
        if (!transaction.prices[assetType]) {
          transaction.prices[assetType] = await prices.getPrice(assetType, transaction.date);
        }
      }
    }
    log.info(`Transaction price info is up to date`);
  };

  const mergeChainData = async (chainData: ChainData): Promise<void> => {
    log.info(`Merging chain data containing ${chainData.json.transactions.length} txns`);
    txns = mergeEthTransactions(txns, addressBook, chainData, getLastUpdated(), log);
    validate();
    sync();
  };

  const mergeCoinbase = async (csvData: string): Promise<void> => {
    txns = mergeCoinbaseTransactions(txns, csvData, log);
    validate();
    sync();
  };

  const mergeDigitalOcean = async (csvData: string): Promise<void> => {
    txns = mergeDigitalOceanTransactions(txns, csvData, log);
    validate();
    sync();
  };

  const mergeWazrix = async (csvData: string): Promise<void> => {
    txns = mergeWazrixTransactions(txns, csvData, log);
    validate();
    sync();
  };

  const mergeWyre = async (csvData: string): Promise<void> => {
    txns = mergeWyreTransactions(txns, csvData, log);
    validate();
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
    mergeWazrix,
    mergeWyre,
    syncPrices,
  };

};
