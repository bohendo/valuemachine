import { Transaction, TransactionSources, Logger, TransferCategories } from "@finances/types";
import csv from "csv-parse/lib/sync";

import { getTransactionsError } from "../verify";

import { mergeFactory } from "./utils";

export const mergeDigitalOceanTransactions = (
  oldTransactions: Transaction[],
  digitaloceanData: string,
  lastUpdated: number,
  logger?: Logger,
): Transaction[] => {
  const log = logger.child({ module: "DigitalOcean" });
  let transactions = JSON.parse(JSON.stringify(oldTransactions));
  const digitaloceanTransactions = csv(
    digitaloceanData,
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    const {
      ["description"]: description,
      ["USD"]: quantity,
      ["start"]: date,
    } = row;

    if (new Date(date).getTime() <= lastUpdated) {
      return null;
    }

    const transaction = {
      date: (new Date(date)).toISOString(),
      description: `Paid digital ocean for ${description}`,
      prices: {},
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
  }).filter(row => !!row);

  log.info(`Loaded ${digitaloceanTransactions.length} new transactions from digitalocean`);

  digitaloceanTransactions.forEach((digitaloceanTransaction: Transaction): void => {
    log.debug(digitaloceanTransaction.description);
    transactions = mergeFactory({
      allowableTimeDiff: 0,
      log,
      mergeTransactions: () => {},
      shouldMerge: () => false,
    })(transactions, digitaloceanTransaction);
  });

  const error = getTransactionsError(transactions);
  if (error) {
    throw new Error(error);
  }

  return transactions;
};

