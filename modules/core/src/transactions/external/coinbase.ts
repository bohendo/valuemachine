import { Transaction, TransactionSources, Logger, TransferCategories } from "@finances/types";
import { math } from "@finances/utils";
import csv from "csv-parse/lib/sync";

import { mergeTransaction } from "../utils";

export const mergeCoinbaseTransactions = (
  oldTransactions: Transaction[],
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const log = logger.child({ module: "Coinbase" }); 
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of coinbase data`);
  csv(csvData, { columns: true, skip_empty_lines: true }).forEach(row => {

    const {
      ["Timestamp"]: date,
      ["Transaction Type"]: txType,
      ["Asset"]: assetType,
      ["Quantity Transacted"]: quantity,
      ["USD Total (inclusive of fees)"]: usdQuantity,
      ["USD Fees"]: fees,
    } = row;

    const transaction = {
      date: (new Date(date)).toISOString(),
      sources: [TransactionSources.Coinbase],
      tags: [],
      transfers: [],
    } as Transaction;

    let [from, to, category] = ["", "", TransferCategories.Transfer as TransferCategories];

    if (txType === "Send") {
      [from, to, category] = ["coinbase-account", "external-account", TransferCategories.Transfer];
      transaction.description = `Withdraw ${quantity} ${assetType} out of coinbase`;

    } else if (txType === "Receive") {
      [from, to, category] = ["external-account", "coinbase-account", TransferCategories.Transfer];
      transaction.description = `Deposit ${quantity} ${assetType} into coinbase`;

    } else if (txType === "Sell") {
      [from, to, category] = ["coinbase-account", "coinbase-exchange", TransferCategories.SwapOut];
      transaction.transfers.push({
        assetType: "USD",
        category: TransferCategories.SwapIn,
        from: "coinbase-exchange",
        quantity: usdQuantity,
        to: "coinbase-account",
      });
      transaction.description = `Sell ${quantity} ${assetType} for ${usdQuantity} USD on coinbase`;

    } else if (txType === "Buy") {
      [from, to, category] = ["coinbase-exchange", "coinbase-account", TransferCategories.SwapIn];
      transaction.transfers.push({
        assetType: "USD",
        category: TransferCategories.SwapOut,
        from: "coinbase-account",
        quantity: usdQuantity,
        to: "coinbase-exchange",
      });
      transaction.description = `Buy ${quantity} ${assetType} for ${usdQuantity} USD on coinbase`;
    }

    transaction.transfers.push({ assetType, category, from, quantity, to });

    if (math.gt(fees, "0")) {
      transaction.transfers.push({
        assetType: "USD",
        category: TransferCategories.Expense,
        from: "coinbase-account",
        quantity: fees,
        to: "coinbase-exchange",
      });
    }

    log.debug(transaction, "Parsed row into transaction:");
    mergeTransaction(oldTransactions, transaction, log);

  });
  return oldTransactions;
};

