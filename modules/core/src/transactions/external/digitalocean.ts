import { Transaction, TransactionSources, Logger, TransferCategories } from "@finances/types";
import csv from "csv-parse/lib/sync";

import { mergeTransaction } from "../utils";

export const mergeDigitalOceanTransactions = (
  oldTransactions: Transaction[],
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const log = logger.child({ module: "DigitalOcean" });
  log.info(`Processing ${csvData.split(`\n`).length} rows of digital ocean data`);
  csv(csvData, { columns: true, skip_empty_lines: true }).map(row => {

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
    };
    transaction.transfers.push({
      assetType: "USD",
      category: TransferCategories.Expense,
      from: "digitalocean-account",
      quantity: quantity.replace("$", ""),
      to: "digitalocean",
    });
    return transaction;

  }).filter(row => !!row).forEach(mergeTransaction(oldTransactions, log));
  return oldTransactions;
};

