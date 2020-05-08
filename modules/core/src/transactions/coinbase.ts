import { Transaction, TransactionSources, ILogger, TransferCategories } from "@finances/types";
import { ContextLogger } from "@finances/utils";
import csv from "csv-parse/lib/sync";

import {
  mergeFactory,
  mergeOffChainTransactions,
  shouldMergeOffChain,
} from "./utils";
import { getTransactionsError } from "../verify";

export const mergeCoinbaseTransactions = (
  oldTransactions: Transaction[],
  coinbaseData: string,
  lastUpdated,
  logger?: ILogger,
): Transaction[] => {
  const log = new ContextLogger("Coinbase", logger);
  let transactions = JSON.parse(JSON.stringify(oldTransactions));
  const coinbaseTransactions = csv(
    coinbaseData,
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    const {
      ["Asset"]: assetType,
      ["Quantity Transacted"]: quantity,
      ["Timestamp"]: date,
      ["Transaction Type"]: txType,
      ["USD Spot Price at Transaction"]: price,
      ["USD Total (inclusive of fees)"]: usdQuantity,
    } = row;

    if (new Date(date).getTime() <= lastUpdated) {
      return null;
    }

    const transaction = {
      date: (new Date(date)).toISOString(),
      prices: { [assetType]: price },
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

    log.debug(transaction.description);
    return transaction;
  }).filter(row => !!row);

  log.info(`Processing ${coinbaseTransactions.length} new transactions from coinbase`);

  coinbaseTransactions.forEach((coinbaseTransaction: Transaction): void => {
    log.info(coinbaseTransaction.description);
    transactions = mergeFactory({
      allowableTimeDiff: 15 * 60 * 1000,
      log,
      mergeTransactions: mergeOffChainTransactions,
      shouldMerge: shouldMergeOffChain,
    })(transactions, coinbaseTransaction);
  });

  // The non-zero allowableTimeDiff for exchange merges causes edge cases while insert-sorting
  // edge case is tricky to solve at source, just sort manually ffs
  transactions = transactions.sort((e1: Transaction, e2: Transaction): number =>
    new Date(e1.date).getTime() - new Date(e2.date).getTime(),
  );

  const error = getTransactionsError(transactions);
  if (error) {
    throw new Error(error);
  }

  return transactions;
};

