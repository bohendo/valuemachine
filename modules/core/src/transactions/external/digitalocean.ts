import { Transaction, TransactionSources, Logger, TransferCategories } from "@finances/types";
import csv from "csv-parse/lib/sync";

import { mergeTransaction } from "../merge";

export const mergeDigitalOceanTransactions = (
  oldTransactions: Transaction[],
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const log = logger.child({ module: "DigitalOcean" });
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of digital ocean data`);
  csv(csvData, { columns: true, skip_empty_lines: true }).forEach(row => {

    const {
      ["description"]: description,
      ["USD"]: quantity,
      ["start"]: date,
    } = row;
    const transaction = {
      date: (new Date(date)).toISOString(),
      description: `Paid digital ocean for ${description}`,
      sources: [TransactionSources.DigitalOcean],
      tags: ["f1040sc-L20a"],
      transfers: [],
    } as Transaction;
    transaction.transfers.push({
      asset: "USD",
      category: TransferCategories.Expense,
      from: "digitalocean-account",
      quantity: quantity.replace("$", ""),
      to: "digitalocean",
    });

    log.debug(transaction, "Parsed row into transaction:");
    mergeTransaction(oldTransactions, transaction, log);

  });
  return oldTransactions;
};

