import csv from "csv-parse/lib/sync";
import fs from "fs";

import { Event } from "../types";
import { Logger } from "../utils";
import { getCategory, getDescription } from "./utils";

export const formatCoinbase = (filename: string, logLevel?: number): Event[] => {
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
    const event = {
      assetsIn: [row["Transaction Type"] === "Sell" ? usd : asset],
      assetsOut: [row["Transaction Type"] === "Buy"  ? usd : asset],
      date: (new Date(row["Timestamp"])).toISOString(),
      prices: { [asset.type]: row["USD Spot Price at Transaction"] },
      source: "coinbase",
      tags: [],
    } as Event;
    event.category = getCategory(event, log);
    event.description = getDescription(event, log);
    log.debug(event.description);
    return event;
  });
};
