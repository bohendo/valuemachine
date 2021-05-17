import {
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@finances/types";
import csv from "csv-parse/lib/sync";

import { mergeTransaction } from "../utils";

export const mergeWazirxTransactions = (
  oldTransactions: Transaction[],
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const log = logger.child({ module: "Wazirx" });
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of waxrix data`);
  csv(csvData, { columns: true, skip_empty_lines: true }).forEach(row => {

    const date = row["Date"];

    // Ignore any rows with an invalid timestamp
    if (isNaN((new Date(date)).getUTCFullYear())) return null;

    const transaction = {
      // trailing Z is important bc it designates GMT times insead of local time
      date: (new Date(date.replace(" ", "T") + "Z")).toISOString(),
      description: "",
      sources: [TransactionSources.Wazirx],
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
        log.debug(`Skipping INR ${txType}`);
        return null;
      }

      if (txType === "Deposit") {
        transaction.transfers.push({
          assetType: currency,
          category: TransferCategories.Transfer,
          from: "external-account",
          quantity,
          to: "wazirx-account",
        });
        transaction.description = `Deposited ${quantity} ${currency} into Wazirx`;
      } else if (txType === "Withdraw") {
        transaction.transfers.push({
          assetType: currency,
          category: TransferCategories.Transfer,
          from: "wazirx-account",
          quantity,
          to: "external-account",
        });
        transaction.description = `Withdrew ${quantity} ${currency} from Wazirx`;
      } else {
        log.warn(`Invalid Wazirx tx type: ${txType}`);
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
        from: "wazirx-account",
        quantity: feeAmount,
        to: "wazirx-exchange",
      });

      if (tradeType === "Buy") {
        transaction.transfers.push({
          assetType: "INR",
          category: TransferCategories.SwapOut,
          from: "wazirx-account",
          quantity: inrQuantity,
          to: "wazirx-exchange",
        });
        transaction.transfers.push({
          assetType: currency,
          category: TransferCategories.SwapIn,
          from: "wazirx-exchange",
          quantity: quantity,
          to: "wazirx-account",
        });
        transaction.description = `Buy ${quantity} ${currency} for ${inrQuantity} INR on wazirx`;

      } else if (tradeType === "Sell") {
        transaction.transfers.push({
          assetType: currency,
          category: TransferCategories.SwapOut,
          from: "wazirx-account",
          quantity: quantity,
          to: "wazirx-exchange",
        });
        transaction.transfers.push({
          assetType: "INR",
          category: TransferCategories.SwapIn,
          from: "wazirx-exchange",
          quantity: inrQuantity,
          to: "wazirx-account",
        });
        transaction.description = `Sell ${quantity} ${currency} for ${inrQuantity} INR on wazirx`;

      } else {
        log.warn(`Invalid Wazirx trade type: ${tradeType}`);
        return null;
      }

    }

    log.debug(transaction, "Parsed row into transaction:");
    mergeTransaction(oldTransactions, transaction, log);

  });
  return oldTransactions;
};

