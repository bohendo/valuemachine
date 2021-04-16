import { Transaction, TransactionSources, Logger, TransferCategories } from "@finances/types";
import csv from "csv-parse/lib/sync";

import { mergeFactory, isDuplicateOffChain } from "../utils";

export const mergeDigitalOceanTransactions = (
  oldTransactions: Transaction[],
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const log = logger.child({ module: "DigitalOcean" });
  log.info(`Processing ${csvData.split(`\n`).length} rows of digital ocean data`);
  let transactions = JSON.parse(JSON.stringify(oldTransactions));

  const digitaloceanTransactions = csv(
    csvData,
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    const {
      ["description"]: description,
      ["USD"]: quantity,
      ["start"]: date,
    } = row;

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

  log.info(`Merging ${digitaloceanTransactions.length} new transactions from digitalocean`);

  digitaloceanTransactions.forEach((digitaloceanTransaction: Transaction): void => {
    log.debug(digitaloceanTransaction.description);
    transactions = mergeFactory({
      allowableTimeDiff: 0,
      log,
      mergeTransactions: () => {},
      shouldMerge: () => false,
      isDuplicate: isDuplicateOffChain,
    })(transactions, digitaloceanTransaction);
  });

  return transactions;
};

