import {
  CsvParser,
  StoreKeys,
  Transactions,
  TransactionsJson,
  TransactionsParams,
} from "@valuemachine/types";
import {
  getLogger,
  getTransactionsError,
} from "@valuemachine/utils";

import { parseCsv } from "./csv";
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

  const merge = (transactions: TransactionsJson): void => {
    log.info(`Merging ${transactions.length} new txs into ${json.length} existing txs`);
    transactions.forEach(tx => mergeTransaction(json, tx, log));
    sync();
    log.info(`Successful merge, now we have ${json.length} txs`);
  };

  const mergeCsv = (csvData: string, parser: CsvParser): void => {
    merge((parser || parseCsv)(csvData, log));
    sync();
  };

  return {
    json,
    mergeCsv,
    merge,
  };

};
