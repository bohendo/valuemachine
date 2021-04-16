import {
  AddressBook,
  AssetTypes,
  ChainData,
  Logger,
  Store,
  StoreKeys,
  Transaction,
  Transactions,
  TransactionsJson,
} from "@finances/types";

import { getPrices } from "../prices";
import { getTransactionsError } from "../verify";

import { mergeEthTransactions } from "./eth";
import { mergeCoinbaseTransactions } from "./coinbase";
import { mergeDigitalOceanTransactions } from "./digitalocean";
import { mergeWyreTransactions } from "./wyre";
import { mergeWazrixTransactions } from "./wazrix";
import { mergeDefaultTransactions } from "./utils";

type TransactionsParams = {
  addressBook: AddressBook;
  store?: Store;
  logger: Logger;
  transactionsJson?: TransactionsJson;
};

export const getTransactions = (params: TransactionsParams): Transactions => {
  const { addressBook, store, logger, transactionsJson } = params;
  const log = logger.child({ module: "Transactions" });

  let txns = transactionsJson || (store ? store.load(StoreKeys.Transactions) : []);

  const getLastUpdated = () =>
    txns.length !== 0 ? new Date(txns[txns.length - 1].date).getTime() : 0;

  log.info(`Loaded ${txns.length} transactions from ${
    transactionsJson ? "input" : store ? "store" : "default"
  }, most recent was on ${getLastUpdated()}`);

  ////////////////////////////////////////
  // Internal Helper Methods

  const sync = async () => {

    // A non-zero allowableTimeDiff for exchange merges causes edge cases while insert-sorting
    // This edge case is tricky to solve at source, just sort manually instead
    txns = txns.sort((e1: Transaction, e2: Transaction): number =>
      new Date(e1.date).getTime() - new Date(e2.date).getTime(),
    );

    // Attach Prices
    log.debug(`Attaching price info to transactions`);
    const prices = getPrices(store, logger);
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
    log.debug(`Transaction price info is up to date`);

    // Reset Indicies
    let i = 1;
    txns.forEach(transaction => transaction.index = i++);
    log.debug(`Transaction indicies have been reset`);

    // Validate data
    const error = getTransactionsError(txns);
    if (error) {
      throw new Error(error);
    } else {
      log.debug("All transactions have been validated");
    }

    // Save to store
    store.save(StoreKeys.Transactions, txns);
  };

  ////////////////////////////////////////
  // Exported Methods

  const mergeChainData = async (chainData: ChainData): Promise<void> => {
    txns = mergeEthTransactions(txns, addressBook, chainData, getLastUpdated(), log);
    await sync();
  };

  const mergeCoinbase = async (csvData: string): Promise<void> => {
    txns = mergeCoinbaseTransactions(txns, csvData, getLastUpdated(), logger);
    await sync();
  };

  const mergeDigitalOcean = async (csvData: string): Promise<void> => {
    txns = mergeDigitalOceanTransactions(txns, csvData, getLastUpdated(), logger);
    await sync();
  };

  const mergeWyre = async (csvData: string): Promise<void> => {
    txns = mergeWyreTransactions(txns, csvData, getLastUpdated(), logger);
    await sync();
  };

  const mergeWazrix = async (csvData: string): Promise<void> => {
    txns = mergeWazrixTransactions(txns, csvData, getLastUpdated(), logger);
    await sync();
  };

  const mergeTransaction = async (transaction: Partial<Transaction>): Promise<void> => {
    txns = mergeDefaultTransactions(txns, transaction, getLastUpdated());
    await sync();
  };

  return {
    json: txns,
    mergeChainData,
    mergeCoinbase,
    mergeDigitalOcean,
    mergeWyre,
    mergeWazrix,
    mergeTransaction,
  };

};
