import {
  Asset,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import csv from "csv-parse/lib/sync";
import { gt } from "@valuemachine/utils";

import { Assets } from "../assets";
import { CsvSources, Guards } from "../enums";
import { mergeTransaction } from "../merge";
import { getGuard } from "../utils";

const guard = Guards.USA;

const { DAI, ETH, SAI, USD } = Assets;
const { Fee, SwapIn, SwapOut, Internal } = TransferCategories;

export const mergeWyreTransactions = (
  oldTransactions: Transaction[],
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const source = CsvSources.Wyre;
  const log = logger.child({ module: source });
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of wyre data`);
  csv(csvData, { columns: true, skip_empty_lines: true }).forEach(row => {

    const {
      ["Created At"]: date,
      ["Dest Amount"]: destAmount,
      ["Dest Currency"]: rawDestType,
      ["Fees DAI"]: daiFees,
      ["Fees ETH"]: ethFees,
      ["Fees USD"]: usdFees,
      ["Source Amount"]: sourceAmount,
      ["Source Currency"]: rawSourceType,
      ["Type"]: txType,
    } = row;

    const account = `${guard}/${source}/account`;
    const exchange = `${guard}/${source}`;

    const fixAssetType = (asset: Asset): Asset =>
      asset === DAI && new Date(date).getTime() < new Date("2019-12-02T00:00:00Z").getTime()
        ? SAI
        : asset;

    const destType = fixAssetType(rawDestType);
    const sourceType = fixAssetType(rawSourceType);

    // Ignore any rows with an invalid timestamp
    if (isNaN((new Date(date)).getUTCFullYear())) return null;
    const transaction = {
      apps: [],
      date: (new Date(date)).toISOString(),
      sources: [source],
      transfers: [],
      uuid: `${source}/${date}`,
    } as Transaction;

    // Push transfer depending on exchange/currency types

    if (txType === "EXCHANGE") {
      transaction.transfers.push({
        asset: sourceType,
        category: SwapOut,
        from: account,
        amount: sourceAmount,
        to: exchange,
      });
      transaction.transfers.push({
        asset: destType,
        category: SwapIn,
        from: exchange,
        amount: destAmount,
        to: account,
      });
      transaction.method = sourceType === USD ? "Buy" : "Sell";

    } else if (txType === "INCOMING" && destType === sourceType) {
      transaction.transfers.push({
        asset: destType,
        category: Internal,
        from: `${getGuard(destType)}/unknown`,
        amount: destAmount,
        to: account,
      });
      transaction.method = "Deposit";

    } else if (txType === "INCOMING" && destType !== sourceType) {
      transaction.transfers.push({
        asset: sourceType,
        category: SwapOut,
        from: `${getGuard(sourceType)}/unknown`,
        amount: sourceAmount,
        to: exchange,
      });
      transaction.transfers.push({
        asset: destType,
        category: SwapIn,
        from: exchange,
        amount: destAmount,
        to: account,
      });
      transaction.method = sourceType === USD ? "Buy" : "Sell";

    } else if (txType === "OUTGOING" && destType === sourceType) {
      transaction.transfers.push({
        asset: destType,
        category: Internal,
        from: account,
        amount: destAmount,
        to: `${getGuard(destType)}/unknown`,
      });
      transaction.method = "Withdraw";

    } else if (txType === "OUTGOING" && destType !== sourceType) {
      transaction.transfers.push({
        asset: sourceType,
        category: SwapOut,
        from: account,
        amount: sourceAmount,
        to: exchange,
      });
      transaction.transfers.push({
        asset: destType,
        category: SwapIn,
        from: exchange,
        amount: destAmount,
        to: `${getGuard(destType)}/unknown`,
      });
      transaction.method = sourceType === USD ? "Buy" : "Sell";
    }

    // Add fees paid to exchange
    const feeTransfer = {
      category: Fee,
      from: account,
      to: exchange,
    };
    if (gt(usdFees, "0")) {
      transaction.transfers.push({ ...feeTransfer, asset: USD, amount: usdFees });
    } else if (gt(ethFees, "0")) {
      transaction.transfers.push({ ...feeTransfer, asset: ETH, amount: ethFees });
    } else if (gt(daiFees, "0")) {
      transaction.transfers.push({ ...feeTransfer, asset: fixAssetType(DAI), amount: daiFees });
    }

    log.debug(transaction, "Parsed row into transaction:");
    mergeTransaction(oldTransactions, transaction, log);

  });
  return oldTransactions;
};
