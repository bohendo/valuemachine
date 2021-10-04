import {
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import csv from "csv-parse/lib/sync";
import { hashCsv, mul, round } from "@valuemachine/utils";

import { Assets, CsvSources, Guards, Methods } from "../enums";
import { mergeTransaction } from "../merge";

const guard = Guards.USA;
const source = CsvSources.Elements;
const asset = Assets.USD;

export const mergeElementsTransactions = (
  oldTransactions: Transaction[],
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const log = logger.child({ module: source }); 
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of ${source} data`);
  csv(csvData, { columns: true, skip_empty_lines: true }).forEach((row, rowIndex) => {

    const {
      ["Balance"]: balance,
      ["Credit"]: credit,
      ["Debit"]: debit,
      ["Description"]: description,
      ["Post Date"]: date,
      ["Status"]: status,
    } = row;

    const amount = status === "Posted" ? (credit || mul(debit, "-1")) : "0";
    log.info(`Changed of $${amount} w new balance of ${balance} after: ${description}`);

    if (status !== "Posted") {
      log.warn(`Ignoring ${status} tx from ${source}: ${description}`);
      return;

    }

    const account = `${guard}/${source}/account`;
    const bank = `${guard}/${source}`;
    const external = `${guard}/unknown`;
    const transaction = {
      apps: [],
      date: (new Date(date)).toISOString(),
      method: Methods.Unknown,
      sources: [source],
      transfers: [],
      uuid: `${source}/${hashCsv(csvData)}/${rowIndex}`,
    } as Transaction;

    if (debit) {
      transaction.transfers.push({
        amount: round(debit, 2),
        asset,
        category: TransferCategories.Expense,
        from: account,
        to: external,
      });
    }

    if (credit) {
      transaction.transfers.push({
        amount: round(credit, 2),
        asset,
        category: TransferCategories.Income,
        from: description === "Interest Income" ? bank : external,
        to: account,
      });
    }

    log.debug(transaction, "Parsed row into transaction:");
    mergeTransaction(oldTransactions, transaction, log);

  });
  return oldTransactions;
};

