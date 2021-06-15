import {
  TransactionParams,
  TransactionsJson,
  ExternalSource,
  ExternalSources,
  ChainData,
  StoreKeys,
  Transactions,
} from "@valuemachine/types";
import { getLogger, getTransactionsError } from "@valuemachine/utils";

import { parseEthTx } from "./ethereum";
import {
  mergeCoinbaseTransactions,
  mergeDigitalOceanTransactions,
  mergeWazirxTransactions,
  mergeWyreTransactions,
} from "./external";
import { mergeTransaction } from "./merge";

export const getTransactions = ({
  addressBook,
  logger,
  store,
  transactionsJson,
}: TransactionParams): Transactions => {
  const log = (logger || getLogger()).child({ module: "Transactions" });

  const json = transactionsJson || (store ? store.load(StoreKeys.Transactions) : []);

  log.debug(`Loaded transaction data containing ${
    json.length
  } transactions from ${transactionsJson ? "input" : store ? "store" : "default"}`);

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

  const getJson = () => json;

  const mergeEthereum = async (chainData: ChainData): Promise<void> => {
    const newEthTxns = chainData.getEthTransactions(ethTx =>
      !json.some(tx => tx.hash === ethTx.hash),
    );
    log.info(`Merging ${newEthTxns.length} new eth transactions`);
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

  const mergeCsv = (source: ExternalSource, csvData: string): Promise<void> => {
    if (source === ExternalSources.Coinbase) {
      mergeCoinbaseTransactions(json, csvData, log);
    } else if (source === ExternalSources.DigitalOcean) {
      mergeDigitalOceanTransactions(json, csvData, log);
    } else if (source === ExternalSources.Wazirx) {
      mergeWazirxTransactions(json, csvData, log);
    } else if (source === ExternalSources.Wyre) {
      mergeWyreTransactions(json, csvData, log);
    } else {
      log.warn(`Unknown source "${source}", expected one of ${
        Object.keys(ExternalSources).join(`", "`)
      }`);
    }
    sync();
  };

  const merge = async (transactions: TransactionsJson): Promise<void> => {
    log.info(`Merging ${transactions.length} new txs into ${json.length} existing txs`);
    transactions.forEach(tx => mergeTransaction(json, tx, log));
    sync();
    log.info(`Successful merge, now we have ${json.length} txs`);
  };

  return {
    getJson,
    mergeEthereum,
    mergeCsv,
    merge,
  };

};
