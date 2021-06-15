import {
  Assets,
  Transaction,
  TransactionSources,
  Logger,
  TransferCategories,
} from "@valuemachine/types";
import csv from "csv-parse/lib/sync";

import { mergeTransaction } from "../merge";

export const mergeDigitalOceanTransactions = (
  oldTransactions: Transaction[],
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const source = TransactionSources.DigitalOcean;
  const log = logger.child({ module: source });
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of digital ocean data`);
  csv(csvData, { columns: true, skip_empty_lines: true }).forEach(row => {

    const {
      ["description"]: description,
      ["USD"]: quantity,
      ["start"]: date,
    } = row;
    log.info(`Paid digital ocean for ${description}`);
    const transaction = {
      date: (new Date(date)).toISOString(),
      method: "Payment",
      sources: [source],
      tags: ["f1040sc-L20a"],
      transfers: [],
    } as Transaction;
    transaction.transfers.push({
      asset: Assets.USD,
      category: TransferCategories.Expense,
      from: "USD-account",
      quantity: quantity.replace("$", ""),
      to: source,
    });

    log.debug(transaction, "Parsed row into transaction:");
    mergeTransaction(oldTransactions, transaction, log);

  });
  return oldTransactions;
};

