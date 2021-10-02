import {
  Logger,
  Transaction,
  TransferCategories,
  TransferCategory,
} from "@valuemachine/types";
import csv from "csv-parse/lib/sync";
import { gt, hashCsv } from "@valuemachine/utils";

import { CsvSources, Guards } from "../enums";
import { mergeTransaction } from "../merge";
import { getGuard } from "../utils";

const guard = Guards.USA;

const { Fee, SwapIn, SwapOut, Internal, Noop } = TransferCategories;

export const mergeCoinbaseTransactions = (
  oldTransactions: Transaction[],
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const source = CsvSources.Coinbase;
  const log = logger.child({ module: source }); 
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of ${source} data`);
  csv(csvData, { columns: true, skip_empty_lines: true }).forEach((row, rowIndex) => {

    const {
      ["Timestamp"]: date,
      ["Transaction Type"]: txType,
      ["Asset"]: asset,
      ["Quantity Transacted"]: amount,
      ["USD Total (inclusive of fees)"]: usdAmount,
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
      uuid: `${source}/${hashCsv(csvData)}/${rowIndex}`,
    } as Transaction;

    let [from, to, category] = ["", "", Noop as TransferCategory];

    if (txType === "Send") {
      [from, to, category] = [account, external, Internal];
      transaction.method = "Withdraw";

    } else if (txType === "Receive") {
      [from, to, category] = [external, account, Internal];
      transaction.method = "Deposit";

    } else if (txType === "Sell") {
      [from, to, category] = [account, exchange, SwapOut];
      transaction.transfers.push({
        asset: "USD",
        category: SwapIn,
        from: exchange,
        amount: usdAmount,
        to: account,
      });
      transaction.method = txType;

    } else if (txType === "Buy") {
      [from, to, category] = [exchange, account, SwapIn];
      transaction.transfers.push({
        asset: "USD",
        category: SwapOut,
        from: account,
        amount: usdAmount,
        to: exchange,
      });
      transaction.method = txType;
    }

    transaction.transfers.push({ asset, category, from, amount, to });

    if (gt(fees, "0")) {
      transaction.transfers.push({
        asset: "USD",
        category: Fee,
        from: account,
        amount: fees,
        to: exchange,
      });
    }

    log.debug(transaction, "Parsed row into transaction:");
    mergeTransaction(oldTransactions, transaction, log);

  });
  return oldTransactions;
};

