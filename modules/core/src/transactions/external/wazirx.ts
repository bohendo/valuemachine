import {
  Assets,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@finances/types";
import csv from "csv-parse/lib/sync";

import { mergeTransaction } from "../merge";

const { Expense, SwapIn, SwapOut, Deposit, Withdraw } = TransferCategories;

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

    const account = `${TransactionSources.Wazirx}-account`;
    const exchange = TransactionSources.Wazirx;
    const external = "external-account";

    if (row["Transaction"]) {
      const {
        ["Transaction"]: txType,
        ["Currency"]: currency,
        ["Volume"]: quantity,
      } = row;

      if (currency === Assets.INR) {
        log.debug(`Skipping INR ${txType}`);
        return null;
      }

      if (txType === "Deposit") {
        transaction.transfers.push({
          asset: currency,
          category: Deposit,
          from: external,
          quantity,
          to: account,
        });
        transaction.description = `Deposited ${quantity} ${currency} into Wazirx`;
      } else if (txType === "Withdraw") {
        transaction.transfers.push({
          asset: currency,
          category: Withdraw,
          from: account,
          quantity,
          to: external,
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

      // Assumes all markets are strings like `INR${asset}`
      const currency = market.replace("INR", "");

      transaction.transfers.push({
        asset: feeAsset,
        category: Expense,
        from: account,
        quantity: feeAmount,
        to: exchange,
      });

      if (tradeType === "Buy") {
        transaction.transfers.push({
          asset: Assets.INR,
          category: SwapOut,
          from: account,
          quantity: inrQuantity,
          to: exchange,
        });
        transaction.transfers.push({
          asset: currency,
          category: SwapIn,
          from: exchange,
          quantity: quantity,
          to: account,
        });
        transaction.description = `Buy ${quantity} ${currency} for ${inrQuantity} INR on wazirx`;

      } else if (tradeType === "Sell") {
        transaction.transfers.push({
          asset: currency,
          category: SwapOut,
          from: account,
          quantity: quantity,
          to: exchange,
        });
        transaction.transfers.push({
          asset: Assets.INR,
          category: SwapIn,
          from: exchange,
          quantity: inrQuantity,
          to: account,
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

