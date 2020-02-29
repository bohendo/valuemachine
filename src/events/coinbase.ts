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
    const event = {
      assetsIn: [],
      assetsOut: [],
      date: (new Date(row["Timestamp"])).toISOString(),
      prices: {},
      source: "coinbase",
      tags: [],
    } as Event;

    const usd = {
      amount: row["USD Total (inclusive of fees)"],
      type: "USD",
    };
    const asset = {
      amount: row["Quantity Transacted"],
      type: row["Asset"],
    };

    event.prices[asset.type] = row["USD Spot Price at Transaction"];

    if (row["Transaction Type"] === "Send") {
      event.from = "coinbase";
      event.to = "external";
      event.assetsIn.push(asset);
      event.tags.push("ignore");
    } else if (row["Transaction Type"] === "Receive") {
      event.from = "external";
      event.to = "coinbase";
      event.assetsOut.push(asset);
      event.tags.push("ignore");
    } else if (row["Transaction Type"] === "Sell") {
      event.from = "coinbase";
      event.to = "coinbase";
      event.assetsOut.push(asset);
      event.assetsIn.push(usd);
    } else if (row["Transaction Type"] === "Buy") {
      event.from = "coinbase";
      event.to = "coinbase";
      event.assetsIn.push(asset);
      event.assetsOut.push(usd);
    }

    event.category = getCategory(event, log);
    event.description = getDescription(event, log);
    log.info(event.description);
    return event;
  });
};
