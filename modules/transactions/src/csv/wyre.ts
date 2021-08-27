import {
  Asset,
  Guards,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";
import csv from "csv-parse/lib/sync";
import { gt } from "@valuemachine/utils";

import { Assets } from "../assets";
import { mergeTransaction } from "../merge";
import { getGuard } from "../utils";

const guard = Guards.USA;

const { DAI, ETH, SAI, USD } = Assets;
const { Expense, SwapIn, SwapOut, Deposit, Withdraw } = TransferCategories;

export const mergeWyreTransactions = (
  oldTransactions: Transaction[],
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const source = TransactionSources.Wyre;
  const log = logger.child({ module: source });
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of wyre data`);
  csv(csvData, { columns: true, skip_empty_lines: true }).forEach(row => {

    const {
      ["Created At"]: date,
      ["Dest Amount"]: destQuantity,
      ["Dest Currency"]: rawDestType,
      ["Fees DAI"]: daiFees,
      ["Fees ETH"]: ethFees,
      ["Fees USD"]: usdFees,
      ["Source Amount"]: sourceQuantity,
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
    } as Transaction;

    // Push transfer depending on exchange/currency types

    if (txType === "EXCHANGE") {
      transaction.transfers.push({
        asset: sourceType,
        category: SwapOut,
        from: account,
        quantity: sourceQuantity,
        to: exchange,
      });
      transaction.transfers.push({
        asset: destType,
        category: SwapIn,
        from: exchange,
        quantity: destQuantity,
        to: account,
      });
      transaction.method = sourceType === USD ? "Buy" : "Sell";

    } else if (txType === "INCOMING" && destType === sourceType) {
      transaction.transfers.push({
        asset: destType,
        category: Deposit,
        from: `${getGuard(destType)}/unknown`,
        quantity: destQuantity,
        to: account,
      });
      transaction.method = "Deposit";

    } else if (txType === "INCOMING" && destType !== sourceType) {
      transaction.transfers.push({
        asset: sourceType,
        category: SwapOut,
        from: `${getGuard(sourceType)}/unknown`,
        quantity: sourceQuantity,
        to: exchange,
      });
      transaction.transfers.push({
        asset: destType,
        category: SwapIn,
        from: exchange,
        quantity: destQuantity,
        to: account,
      });
      transaction.method = sourceType === USD ? "Buy" : "Sell";

    } else if (txType === "OUTGOING" && destType === sourceType) {
      transaction.transfers.push({
        asset: destType,
        category: Withdraw,
        from: account,
        quantity: destQuantity,
        to: `${getGuard(destType)}/unknown`,
      });
      transaction.method = "Withdraw";

    } else if (txType === "OUTGOING" && destType !== sourceType) {
      transaction.transfers.push({
        asset: sourceType,
        category: SwapOut,
        from: account,
        quantity: sourceQuantity,
        to: exchange,
      });
      transaction.transfers.push({
        asset: destType,
        category: SwapIn,
        from: exchange,
        quantity: destQuantity,
        to: `${getGuard(destType)}/unknown`,
      });
      transaction.method = sourceType === USD ? "Buy" : "Sell";
    }

    // Add fees paid to exchange
    const feeTransfer = {
      category: Expense,
      from: account,
      to: exchange,
    };
    if (gt(usdFees, "0")) {
      transaction.transfers.push({ ...feeTransfer, asset: USD, quantity: usdFees });
    } else if (gt(ethFees, "0")) {
      transaction.transfers.push({ ...feeTransfer, asset: ETH, quantity: ethFees });
    } else if (gt(daiFees, "0")) {
      transaction.transfers.push({ ...feeTransfer, asset: fixAssetType(DAI), quantity: daiFees });
    }

    log.debug(transaction, "Parsed row into transaction:");
    mergeTransaction(oldTransactions, transaction, log);

  });
  return oldTransactions;
};
