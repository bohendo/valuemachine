import { getLogger } from "@valuemachine/utils";

import { CsvParser, parseCsv } from "./csv";
import { mergeTransaction } from "./merge";
import { TransactionsParams, TransactionsJson, Transactions } from "./types";
import { getTransactionsError } from "./utils";

export const getTransactions = (params?: TransactionsParams): Transactions => {
  const { json: transactionsJson, logger, save } = params || {};

  const log = (logger || getLogger()).child({ module: "Transactions" });
  const json = transactionsJson || [] as TransactionsJson;

  const error = getTransactionsError(json);
  if (error) throw new Error(error);

  log.debug(`Loaded transaction data containing ${
    json.length
  } transactions from ${transactionsJson ? "input" : "default"}`);

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
    if (save) {
      log.info(`Saving ${json.length} transactions to storage`);
      save?.(json);
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

  const mergeCsv = (csvData: string, parser?: CsvParser): void => {
    merge((parser || parseCsv)(csvData, log));
    sync();
  };

  return {
    json,
    mergeCsv,
    merge,
  };

};
