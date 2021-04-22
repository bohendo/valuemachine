import {
  TransactionParams,
  TransactionsJson,
  ChainData,
  StoreKeys,
  Transactions,
} from "@finances/types";
import { getLogger } from "@finances/utils";

import { getTransactionsError } from "../verify";

import { parseEthTx } from "./eth";
import {
  mergeCoinbaseTransactions,
  mergeDigitalOceanTransactions,
  mergeWazrixTransactions,
  mergeWyreTransactions,
} from "./external";
import { mergeTransaction } from "./utils";

// Note: we must import chain data before off-chain stuff to ensure merges work properly
export const getTransactions = ({
  addressBook,
  logger,
  store,
  transactionsJson,
}: TransactionParams): Transactions => {
  const log = (logger || getLogger()).child({ module: "Transactions" });

  const json = transactionsJson || (store ? store.load(StoreKeys.Transactions) : []);

  ////////////////////////////////////////
  // Internal Helper Methods

  const sync = () => {
    // Reset Indicies
    let i = 1;
    json.forEach(transaction => transaction.index = i++);
    // Validate
    const error = getTransactionsError(json);
    if (error) {
      throw new Error(error);
    } else {
      log.debug("All transactions have been validated");
    }
    if (store) {
      // Save to store
      log.info(`Saving ${json.length} transactions to storage`);
      store.save(StoreKeys.Transactions, json);
    }
  };

  ////////////////////////////////////////
  // Exported Methods

  const mergeChainData = async (chainData: ChainData): Promise<void> => {
    const newEthTxns = chainData.getEthTransactions(ethTx =>
      !json.some(tx => tx.hash === ethTx.hash),
    );
    log.info(`Merging ${newEthTxns.length} new eth transactions.`);
    newEthTxns.forEach(ethTx =>
      mergeTransaction(
        json,
        parseEthTx(
          ethTx,
          addressBook,
          chainData,
          logger,
        ),
        logger,
      )
    );
    sync();
  };

  const mergeCoinbase = async (csvData: string): Promise<void> => {
    mergeCoinbaseTransactions(json, csvData, log);
    sync();
  };

  const mergeDigitalOcean = async (csvData: string): Promise<void> => {
    mergeDigitalOceanTransactions(json, csvData, log);
    sync();
  };

  const mergeWazrix = async (csvData: string): Promise<void> => {
    mergeWazrixTransactions(json, csvData, log);
    sync();
  };

  const mergeWyre = async (csvData: string): Promise<void> => {
    mergeWyreTransactions(json, csvData, log);
    sync();
  };

  const mergeTransactions = async (transactions: TransactionsJson): Promise<void> => {
    transactions.forEach(tx => mergeTransaction(json, tx, log));
    sync();
  };

  return {
    json,
    mergeChainData,
    mergeCoinbase,
    mergeDigitalOcean,
    mergeTransactions,
    mergeWazrix,
    mergeWyre,
  };

};
