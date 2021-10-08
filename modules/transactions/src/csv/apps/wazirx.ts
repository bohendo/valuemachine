import {
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import { hashCsv } from "@valuemachine/utils";
import csv from "csv-parse/lib/sync";

import { Assets, CsvSources, Guards, Methods } from "../../enums";
import { getGuard } from "../../utils";

const guard = Guards.IND;

const { INR } = Assets;
const { Internal, Fee, SwapIn, SwapOut } = TransferCategories;

export const wazirxParser = (
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const source = CsvSources.Wazirx;
  const log = logger.child({ module: source });
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of waxrix data`);
  return csv(csvData, { columns: true, skip_empty_lines: true }).map((row, rowIndex) => {

    const date = row["Date"];

    // Ignore any rows with an invalid timestamp
    if (isNaN((new Date(date)).getUTCFullYear())) return null;

    // re date: trailing Z is important bc it designates GMT times insead of local time
    const transaction = {
      apps: [],
      date: (new Date(date.replace(" ", "T") + "Z")).toISOString(),
      method: Methods.Unknown,
      sources: [source],
      transfers: [],
      uuid: `${source}/${hashCsv(csvData)}/${rowIndex}`,
    } as Transaction;

    const account = `${guard}/${source}/account`;
    const exchange = `${guard}/${source}`;
    let index = 0;

    if (row["Transaction"]) {
      const {
        ["Transaction"]: txType,
        ["Currency"]: currency,
        ["Volume"]: amount,
      } = row;

      const external = `${getGuard(currency)}/unknown`;

      if (txType === "Deposit") {
        transaction.transfers.push({
          asset: currency,
          category: Internal,
          from: external,
          index,
          amount,
          to: account,
        });
        transaction.method = Methods.Deposit;

      } else if (txType === "Withdraw") {
        transaction.transfers.push({
          asset: currency,
          category: Internal,
          from: account,
          index,
          amount,
          to: external,
        });
        transaction.method = Methods.Withdraw;
      } else {
        log.warn(`Invalid ${source} tx type: ${txType}`);
        return null;
      }

    } else if (row["Trade"]) {
      const {
        ["Market"]: market,
        ["Volume"]: amount,
        ["Total"]: inrAmount,
        ["Trade"]: tradeType,
        ["Fee Currency"]: feeAsset,
        ["Fee"]: feeAmount,
      } = row;

      // Assumes all markets are strings like `INR${asset}`
      const currency = market.replace(INR, "");

      if (tradeType === "Buy") {
        transaction.transfers.push({
          asset: INR,
          category: SwapOut,
          from: account,
          index: index++,
          amount: inrAmount,
          to: exchange,
        });
        transaction.transfers.push({
          asset: currency,
          category: SwapIn,
          from: exchange,
          index: index++,
          amount: amount,
          to: account,
        });
        transaction.method = tradeType;

      } else if (tradeType === "Sell") {
        transaction.transfers.push({
          asset: currency,
          category: SwapOut,
          from: account,
          index: index++,
          amount: amount,
          to: exchange,
        });
        transaction.transfers.push({
          asset: INR,
          category: SwapIn,
          from: exchange,
          index: index++,
          amount: inrAmount,
          to: account,
        });
        transaction.method = tradeType;

      } else {
        log.warn(`Invalid ${source} trade type: ${tradeType}`);
        return null;
      }

      transaction.transfers.push({
        asset: feeAsset,
        category: Fee,
        from: account,
        index: index++,
        amount: feeAmount,
        to: exchange,
      });

    }

    log.debug(transaction, "Parsed row into transaction:");
    return transaction;
  }).filter(tx => !!tx);
};

