import {
  CsvParser,
  StoreKeys,
  Transactions,
  TransactionsJson,
  TransactionSource,
  TransactionsParams,
} from "@valuemachine/types";
import {
  getLogger,
  getTransactionsError,
} from "@valuemachine/utils";

import {
  mergeCoinbaseTransactions,
  mergeDigitalOceanTransactions,
  mergeElementsTransactions,
  mergeWazirxTransactions,
  mergeWyreTransactions,
} from "./csv";
import { CsvSources } from "./enums";
import { mergeTransaction } from "./merge";

export const getTransactions = (params?: TransactionsParams): Transactions => {
  const { json: transactionsJson, logger, store } = params || {};

  const log = (logger || getLogger()).child({ module: "Transactions" });
  const json = transactionsJson || (store ? store.load(StoreKeys.Transactions) : []);

  const error = getTransactionsError(json);
  if (error) throw new Error(error);

  log.debug(`Loaded transaction data containing ${
    json.length
  } transactions from ${transactionsJson ? "input" : store ? "store" : "default"}`);

  ////////////////////////////////////////
  // Internal Helper Methods

  const sync = () => {
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

  const mergeCsv = (csvData: string, parser: TransactionSource | CsvParser): void => {
    if (parser === CsvSources.Coinbase) {
      mergeCoinbaseTransactions(json, csvData, log);
    } else if (parser === CsvSources.DigitalOcean) {
      mergeDigitalOceanTransactions(json, csvData, log);
    } else if (parser === CsvSources.Wazirx) {
      mergeWazirxTransactions(json, csvData, log);
    } else if (parser === CsvSources.Wyre) {
      mergeWyreTransactions(json, csvData, log);
    } else if (parser === CsvSources.Elements) {
      mergeElementsTransactions(json, csvData, log);
    } else if (typeof parser === "function") {
      parser(json, csvData, log);
    } else {
      log.warn(`Unknown parser ${parser}, expected one of [${
        Object.keys(CsvSources).join(`, `)
      }] or a custom function`);
    }
    sync();
  };

  const merge = (transactions: TransactionsJson): void => {
    log.info(`Merging ${transactions.length} new txs into ${json.length} existing txs`);
    transactions.forEach(tx => mergeTransaction(json, tx, log));
    sync();
    log.info(`Successful merge, now we have ${json.length} txs`);
  };

  return {
    json,
    mergeCsv,
    merge,
  };

};
