import {
  Transaction,
  TransactionSources,
  Logger,
  TransferCategories,
  TransferCategory,
} from "@finances/types";
import { math } from "@finances/utils";
import csv from "csv-parse/lib/sync";

import { mergeTransaction } from "../merge";

const { gt, round } = math;
const { Expense, SwapIn, SwapOut, Deposit, Withdraw, Unknown } = TransferCategories;

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
      ["Asset"]: asset,
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

    let [from, to, category] = ["", "", Unknown as TransferCategory];

    if (txType === "Send") {
      [from, to, category] = ["coinbase-account", "external-account", Withdraw];
      transaction.description = `Withdrew ${round(quantity)} ${asset} out of coinbase`;

    } else if (txType === "Receive") {
      [from, to, category] = ["external-account", "coinbase-account", Deposit];
      transaction.description = `Deposited ${round(quantity)} ${asset} into coinbase`;

    } else if (txType === "Sell") {
      [from, to, category] = ["coinbase-account", "coinbase-exchange", SwapOut];
      transaction.transfers.push({
        asset: "USD",
        category: SwapIn,
        from: "coinbase-exchange",
        quantity: usdQuantity,
        to: "coinbase-account",
      });
      transaction.description = `Sold ${round(quantity)} ${asset} for ${usdQuantity} USD on coinbase`;

    } else if (txType === "Buy") {
      [from, to, category] = ["coinbase-exchange", "coinbase-account", SwapIn];
      transaction.transfers.push({
        asset: "USD",
        category: SwapOut,
        from: "coinbase-account",
        quantity: usdQuantity,
        to: "coinbase-exchange",
      });
      transaction.description = `Bought ${round(quantity)} ${asset} for ${usdQuantity} USD on coinbase`;
    }

    transaction.transfers.push({ asset, category, from, quantity, to });

    if (gt(fees, "0")) {
      transaction.transfers.push({
        asset: "USD",
        category: Expense,
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

