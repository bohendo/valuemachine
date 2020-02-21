import csv from "csv-parse/lib/sync";
import fs from "fs";

import { Event, InputData, SwapEvent } from "../types";
import { diff, add, sub, round, mul, eq, gt, lt, Logger } from "../utils";

export const formatCoinbase = (filename: string, logLevel?: number): SwapEvent[] => {
  const log = new Logger("Coinbase", logLevel || 3);
  const rawFile = fs.readFileSync(filename, "utf8");
  return csv(
    rawFile,
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    const usd = {
      amount: row["USD Total (inclusive of fees)"],
      type: "USD",
    };
    const asset = {
      amount: row["Quantity Transacted"],
      price: row["USD Spot Price at Transaction"],
      type: row["Asset"],
    };
    const txType = row["Transaction Type"];
    const category = txType === "Buy"  || txType === "Sell" ? "swap" : "transfer";
    const description = `${asset.amount} ${asset.type} coinbase ${category}`;
    log.debug(`${description} (${txType})`);
    return ({
      assetsIn: [txType === "Sell" ? usd : asset],
      assetsOut: [txType === "Buy"  ? usd : asset],
      category,
      date: (new Date(row["Timestamp"])).toISOString(),
      description,
      prices: { [asset.type]: row["USD Spot Price at Transaction"] },
      source: "coinbase",
      tags: [],
    });
  });
};
