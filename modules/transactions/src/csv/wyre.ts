import {
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import csv from "csv-parse/lib/sync";
import { gt, hashCsv, sub } from "@valuemachine/utils";

import { Assets, CsvSources, Guards } from "../enums";
import { mergeTransaction } from "../merge";
import { getGuard } from "../utils";

const { USA } = Guards;
const { BTC, DAI, ETH, SAI, USD } = Assets;
const { Fee, SwapIn, SwapOut, Internal } = TransferCategories;

const daiLaunch = new Date("2019-12-02T00:00:00Z").getTime();

export const mergeWyreTransactions = (
  oldTransactions: Transaction[],
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const source = CsvSources.Wyre;
  const log = logger.child({ module: source });
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of wyre data`);
  csv(csvData, { columns: true, skip_empty_lines: true }).forEach((row, rowIndex) => {

    // Ignore any rows with an invalid timestamp
    const date = new Date(row["Created At"]);
    if (isNaN(date.getUTCFullYear())) return null;

    const btcFee = parseFloat(row["Fees BTC"] || 0).toString();
    const daiFee = parseFloat(row["Fees DAI"] || 0).toString();
    const ethFee = parseFloat(row["Fees ETH"] || 0).toString();
    const usdFee = parseFloat(row["Fees USD"] || 0).toString();
    const {
      ["Dest Amount"]: destAmount,
      ["Dest Currency"]: rawDestType,
      ["Source Amount"]: sourceAmount,
      ["Source Currency"]: rawSourceType,
      ["Type"]: txType,
    } = row;

    const account = `${USA}/${source}/account`;
    const exchange = `${USA}/${source}`;

    const fixDai = asset => asset === DAI && date.getTime() < daiLaunch ? SAI : asset;
    const destType = fixDai(rawDestType);
    const sourceType = fixDai(rawSourceType);

    const transaction = {
      apps: [],
      date: date.toISOString(),
      sources: [source],
      transfers: [],
      uuid: `${source}/${hashCsv(csvData)}/${rowIndex}`,
    } as Transaction;

    const fee = { category: Fee, from: account, to: exchange, index: 0 };
    if (gt(btcFee, "0")) transaction.transfers.push({ ...fee, asset: BTC, amount: daiFee });
    if (gt(daiFee, "0")) transaction.transfers.push({ ...fee, asset: fixDai(DAI), amount: daiFee });
    if (gt(ethFee, "0")) transaction.transfers.push({ ...fee, asset: ETH, amount: ethFee });
    if (gt(usdFee, "0")) transaction.transfers.push({ ...fee, asset: USD, amount: usdFee });

    const minusFee = (amount, asset) => asset === BTC ? sub(amount, btcFee)
      : (asset === DAI || asset === SAI) ? sub(amount, daiFee)
      : asset === ETH ? sub(amount, ethFee)
      : asset === USD ? sub(amount, usdFee)
      : amount;

    // Add transfers depending on exchange/currency types

    if (txType === "EXCHANGE") {
      transaction.transfers.push({
        amount: minusFee(sourceAmount, sourceType),
        asset: sourceType,
        category: SwapOut,
        from: account,
        index: 1,
        to: exchange,
      }, {
        amount: destAmount,
        asset: destType,
        category: SwapIn,
        from: exchange,
        index: 2,
        to: account,
      });
      transaction.method = sourceType === USD ? "Buy" : "Sell";

    } else if (txType === "INCOMING" && destType === sourceType) {
      transaction.transfers.push({
        amount: destAmount,
        asset: destType,
        category: Internal,
        from: `${getGuard(destType)}/unknown`,
        index: 1,
        to: account,
      });
      transaction.method = "Deposit";

    } else if (txType === "INCOMING" && destType !== sourceType) {
      transaction.transfers.push({
        amount: sourceAmount,
        asset: sourceType,
        category: Internal,
        from: `${getGuard(sourceType)}/unknown`,
        index: 1,
        to: account,
      }, {
        amount: minusFee(sourceAmount, sourceType),
        asset: sourceType,
        category: SwapOut,
        from: account,
        index: 2,
        to: exchange,
      }, {
        amount: destAmount,
        asset: destType,
        category: SwapIn,
        from: exchange,
        index: 3,
        to: account,
      });
      transaction.method = sourceType === USD ? "Buy" : "Sell";

    } else if (txType === "OUTGOING" && destType === sourceType) {
      transaction.transfers.push({
        amount: destAmount,
        asset: destType,
        category: Internal,
        from: account,
        index: 1,
        to: `${getGuard(destType)}/unknown`,
      });
      transaction.method = "Withdraw";

    } else if (txType === "OUTGOING" && destType !== sourceType) {
      transaction.transfers.push({
        amount: minusFee(sourceAmount, sourceType),
        asset: sourceType,
        category: SwapOut,
        from: account,
        index: 1,
        to: exchange,
      }, {
        amount: destAmount,
        asset: destType,
        category: SwapIn,
        from: exchange,
        index: 2,
        to: account,
      }, {
        amount: destAmount,
        asset: destType,
        category: Internal,
        from: account,
        index: 3,
        to: `${getGuard(destType)}/unknown`,
      });
      transaction.method = sourceType === USD ? "Buy" : "Sell";
    }

    log.debug(transaction, "Parsed row into transaction:");
    mergeTransaction(oldTransactions, transaction, log);

  });
  return oldTransactions;
};
