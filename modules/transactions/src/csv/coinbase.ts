import {
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import csv from "csv-parse/lib/sync";
import { gt, hashCsv, sub } from "@valuemachine/utils";

import { Assets, CsvSources, Guards, Methods } from "../enums";
import { mergeTransaction } from "../merge";
import { getGuard } from "../utils";

const guard = Guards.USA;

const { Fee, SwapIn, SwapOut, Internal } = TransferCategories;

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
      ["Asset"]: asset,
      ["Quantity Transacted"]: amount,
      ["Timestamp"]: date,
      ["Transaction Type"]: txType,
      ["USD Subtotal"]: usdAmount,
      ["USD Total (inclusive of fees)"]: usdTotal,
    } = row;

    const fee = sub(usdTotal, usdAmount);
    const account = `${guard}/${source}/account`;
    const exchange = `${guard}/${source}`;
    const external = `${getGuard(asset)}/unknown`;

    // NOTE: Coinbase doesn't provide info re transfers to/from bank
    // as a workaround, pretend like coinbase can't hold USD
    // always transfer USD to/from the bank during every sell/buy
    const bank = `${guard}/unknown`;

    let index = 1;
    const transaction = {
      apps: [],
      date: (new Date(date)).toISOString(),
      method: Methods.Unknown,
      sources: [source],
      transfers: [],
      uuid: `${source}/${hashCsv(csvData)}/${rowIndex}`,
    } as Transaction;

    if (txType === "Send") {
      transaction.transfers.push({
        amount,
        asset,
        category: Internal,
        from: account,
        index: index++,
        to: external,
      });
      transaction.method = Methods.Withdraw;

    } else if (txType === "Receive") {
      transaction.transfers.push({
        amount,
        asset,
        category: Internal,
        from: external,
        index: index++,
        to: account,
      });
      transaction.method = Methods.Deposit;

    } else if (txType === "Sell") {
      transaction.transfers.push({
        amount,
        asset,
        category: SwapOut,
        from: account,
        index: index++,
        to: exchange,
      }, {
        amount: usdAmount,
        asset: Assets.USD,
        category: SwapIn,
        from: exchange,
        index: index++,
        to: account,
      }, {
        amount: usdTotal,
        asset: Assets.USD,
        category: Internal,
        from: account,
        index: index++,
        to: bank,
      });
      transaction.method = txType;

    } else if (txType === "Buy") {
      transaction.transfers.push({
        amount: usdTotal,
        asset: Assets.USD,
        category: Internal,
        from: bank,
        index: index++,
        to: account,
      }, {
        amount: usdAmount,
        asset: Assets.USD,
        category: SwapOut,
        from: account,
        index: index++,
        to: exchange,
      }, {
        amount,
        asset,
        category: SwapIn,
        from: exchange,
        index: index++,
        to: account,
      });
      transaction.method = txType;
    }

    if (gt(fee, "0")) {
      transaction.transfers.push({
        amount: fee,
        asset: Assets.USD,
        category: Fee,
        from: account,
        index: index++,
        to: exchange,
      });
    }

    log.debug(transaction, "Parsed row into transaction:");
    mergeTransaction(oldTransactions, transaction, log);

  });
  return oldTransactions;
};

