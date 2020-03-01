import csv from "csv-parse/lib/sync";
import fs from "fs";

import { env } from "../env";
import { Event } from "../types";
import { Logger } from "../utils";
import { getDescription } from "./utils";

export const formatCoinbase = (filename: string): Event[] => {
  const log = new Logger("Coinbase", env.logLevel);
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
      sources: new Set(["coinbase"]),
      tags: new Set(),
    } as Event;

    const usd = {
      assetType: "USD",
      quantity: row["USD Total (inclusive of fees)"],
    };
    const asset = {
      assetType: row["Asset"],
      quantity: row["Quantity Transacted"],
    };

    event.prices[asset.assetType] = row["USD Spot Price at Transaction"];

    if (row["Transaction Type"] === "Send") {
      event.from = "coinbase";
      event.to = "external";
      event.assetsIn.push(asset);
      event.tags.add("ignore");
    } else if (row["Transaction Type"] === "Receive") {
      event.from = "external";
      event.to = "coinbase";
      event.assetsOut.push(asset);
      event.tags.add("ignore");
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

    event.description = getDescription(event);
    log.info(event.description);
    return event;
  });
};
