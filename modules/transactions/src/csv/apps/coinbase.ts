import {
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import csv from "csv-parse/lib/sync";
import { gt, hashCsv, sub } from "@valuemachine/utils";

import { Assets, CsvSources, Guards, Methods } from "../../enums";
import { getGuard } from "../../utils";

const guard = Guards.USA;
const source = CsvSources.Coinbase;
const dateKey = "Timestamp";

export const coinbaseHeaders = [`
${dateKey},
Transaction Type,
Asset,
Quantity Transacted,
USD Spot Price at Transaction,
USD Subtotal,
USD Total (inclusive of fees),
USD Fees,
Notes
`.replace(/\n/g, "")];

export const coinbaseParser = (
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const log = logger.child({ module: source }); 
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of ${source} data`);
  return csv(csvData, { columns: true, skip_empty_lines: true }).sort((r1, r2) => {
    return new Date(r1[dateKey]).getTime() - new Date(r2[dateKey]).getTime();
  }).map((row, rowIndex) => {
    const {
      ["Asset"]: asset,
      ["Quantity Transacted"]: amount,
      [dateKey]: date,
      ["Transaction Type"]: txType,
      ["USD Subtotal"]: usdAmount,
      ["USD Total (inclusive of fees)"]: usdTotal,
    } = row;

    const fee = sub(usdTotal, usdAmount);
    const account = `${guard}/${source}/account`;
    const exchange = `${guard}/${source}`;
    const external = `${getGuard(asset)}/default`;

    // NOTE: Coinbase doesn't provide info re transfers to/from bank
    // as a workaround, pretend like coinbase can't hold USD
    // always transfer USD to/from the bank during every sell/buy
    const bank = `${guard}/default`;

    const transaction = {
      apps: [],
      date: (new Date(date)).toISOString(),
      index: rowIndex,
      method: Methods.Unknown,
      sources: [source],
      transfers: [],
      uuid: `${source}/${hashCsv(csvData)}/${rowIndex}`,
    } as Transaction;

    let transferIndex = 1;
    if (txType === "Send") {
      transaction.transfers.push({
        amount,
        asset,
        category: TransferCategories.Internal,
        from: account,
        index: transferIndex++,
        to: external,
      });
      transaction.method = Methods.Withdraw;

    } else if (txType === "Receive") {
      transaction.transfers.push({
        amount,
        asset,
        category: TransferCategories.Internal,
        from: external,
        index: transferIndex++,
        to: account,
      });
      transaction.method = Methods.Deposit;

    } else if (txType === "Sell") {
      transaction.transfers.push({
        amount,
        asset,
        category: TransferCategories.SwapOut,
        from: account,
        index: transferIndex++,
        to: exchange,
      }, {
        amount: usdAmount,
        asset: Assets.USD,
        category: TransferCategories.SwapIn,
        from: exchange,
        index: transferIndex++,
        to: account,
      }, {
        amount: usdTotal,
        asset: Assets.USD,
        category: TransferCategories.Internal,
        from: account,
        index: transferIndex++,
        to: bank,
      });
      transaction.method = txType;

    } else if (txType === "Buy") {
      transaction.transfers.push({
        amount: usdTotal,
        asset: Assets.USD,
        category: TransferCategories.Internal,
        from: bank,
        index: transferIndex++,
        to: account,
      }, {
        amount: usdAmount,
        asset: Assets.USD,
        category: TransferCategories.SwapOut,
        from: account,
        index: transferIndex++,
        to: exchange,
      }, {
        amount,
        asset,
        category: TransferCategories.SwapIn,
        from: exchange,
        index: transferIndex++,
        to: account,
      });
      transaction.method = txType;
    }

    if (gt(fee, "0")) {
      transaction.transfers.push({
        amount: fee,
        asset: Assets.USD,
        category: TransferCategories.Fee,
        from: account,
        index: transferIndex++,
        to: exchange,
      });
    }

    return transaction;
  }).filter(tx => !!tx);
};

