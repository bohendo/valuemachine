import {
  Guards,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
  TransferCategory,
} from "@valuemachine/types";
import csv from "csv-parse/lib/sync";
import { gt } from "@valuemachine/utils";

import { mergeTransaction } from "../merge";
import { getGuard } from "../utils";

const guard = Guards.USA;

const { Expense, SwapIn, SwapOut, Deposit, Withdraw, Unknown } = TransferCategories;

export const mergeCoinbaseTransactions = (
  oldTransactions: Transaction[],
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const source = TransactionSources.Coinbase;
  const log = logger.child({ module: source }); 
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

    const account = `${guard}/${source}/account`;
    const exchange = `${guard}/${source}`;
    const external = `${getGuard(asset)}/unknown`;

    const transaction = {
      apps: [],
      date: (new Date(date)).toISOString(),
      sources: [source],
      transfers: [],
    } as Transaction;

    let [from, to, category] = ["", "", Unknown as TransferCategory];

    if (txType === "Send") {
      [from, to, category] = [account, external, Withdraw];
      transaction.method = "Withdraw";

    } else if (txType === "Receive") {
      [from, to, category] = [external, account, Deposit];
      transaction.method = "Deposit";

    } else if (txType === "Sell") {
      [from, to, category] = [account, exchange, SwapOut];
      transaction.transfers.push({
        asset: "USD",
        category: SwapIn,
        from: exchange,
        quantity: usdQuantity,
        to: account,
      });
      transaction.method = txType;

    } else if (txType === "Buy") {
      [from, to, category] = [exchange, account, SwapIn];
      transaction.transfers.push({
        asset: "USD",
        category: SwapOut,
        from: account,
        quantity: usdQuantity,
        to: exchange,
      });
      transaction.method = txType;
    }

    transaction.transfers.push({ asset, category, from, quantity, to });

    if (gt(fees, "0")) {
      transaction.transfers.push({
        asset: "USD",
        category: Expense,
        from: account,
        quantity: fees,
        to: exchange,
      });
    }

    log.debug(transaction, "Parsed row into transaction:");
    mergeTransaction(oldTransactions, transaction, log);

  });
  return oldTransactions;
};

