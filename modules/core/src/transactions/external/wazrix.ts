import {
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@finances/types";
import csv from "csv-parse/lib/sync";

import { mergeTransaction } from "../utils";

export const mergeWazrixTransactions = (
  oldTransactions: Transaction[],
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const log = logger.child({ module: "Wazrix" });
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of waxrix data`);
  csv(csvData, { columns: true, skip_empty_lines: true }).forEach(row => {

    const date = row["Date"];

    // Ignore any rows with an invalid timestamp
    if (isNaN((new Date(date)).getUTCFullYear())) return null;

    const transaction = {
      date: (new Date(date)).toISOString(),
      description: "",
      sources: [TransactionSources.Wazrix],
      tags: [],
      transfers: [],
    } as Transaction;

    if (row["Transaction"]) {
      const {
        ["Transaction"]: txType,
        ["Currency"]: currency,
        ["Volume"]: quantity,
      } = row;

      if (currency === "INR") {
        log.warn(`Skipping INR ${txType}`);
        return null;
      }

      if (txType === "Deposit") {
        transaction.transfers.push({
          assetType: currency,
          category: TransferCategories.Transfer,
          from: "external-account",
          quantity,
          to: "wazrix-account",
        });
        transaction.description = `Deposit ${quantity} ${currency} in to wazrix`;
      } else if (txType === "Withdraw") {
        transaction.transfers.push({
          assetType: currency,
          category: TransferCategories.Transfer,
          from: "wazrix-account",
          quantity,
          to: "external-account",
        });
        transaction.description = `Withdraw ${quantity} ${currency} out of wazrix`;
      } else {
        log.warn(`Invalid Wazrix tx type: ${txType}`);
        return null;
      }

    } else if (row["Trade"]) {
      const {
        ["Market"]: market,
        ["Volume"]: quantity,
        ["Total"]: inrQuantity,
        ["Trade"]: tradeType,
        ["Fee Currency"]: feeAsset,
        ["Fee"]: feeAmount,
      } = row;

      // Assumes all markets are INR markets
      const currency = market.replace("INR", "");

      transaction.transfers.push({
        assetType: feeAsset,
        category: TransferCategories.Expense,
        from: "wazrix-account",
        quantity: feeAmount,
        to: "wazrix-exchange",
      });

      if (tradeType === "Buy") {
        transaction.transfers.push({
          assetType: "INR",
          category: TransferCategories.SwapOut,
          from: "wazrix-account",
          quantity: inrQuantity,
          to: "wazrix-exchange",
        });
        transaction.transfers.push({
          assetType: currency,
          category: TransferCategories.SwapIn,
          from: "wazrix-exchange",
          quantity: quantity,
          to: "wazrix-account",
        });
        transaction.description = `Buy ${quantity} ${currency} for ${inrQuantity} INR on wazrix`;

      } else if (tradeType === "Sell") {
        transaction.transfers.push({
          assetType: currency,
          category: TransferCategories.SwapOut,
          from: "wazrix-account",
          quantity: quantity,
          to: "wazrix-exchange",
        });
        transaction.transfers.push({
          assetType: "INR",
          category: TransferCategories.SwapIn,
          from: "wazrix-exchange",
          quantity: inrQuantity,
          to: "wazrix-account",
        });
        transaction.description = `Sell ${quantity} ${currency} for ${inrQuantity} INR on wazrix`;

      } else {
        log.warn(`Invalid Wazrix trade type: ${tradeType}`);
        return null;
      }

    }

    log.debug(transaction, "Parsed row into transaction:");
    mergeTransaction(oldTransactions, transaction, log);

  });
  return oldTransactions;
};

