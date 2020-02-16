import csv from "csv-parse/lib/sync";
import fs from "fs";

import { Event, InputData, SwapEvent } from "../types";
import { diff, add, sub, round, mul, eq, gt, lt } from "../utils";

export const formatCoinbase = (filename: string): SwapEvent[] => {
  const rawFile = fs.readFileSync(filename, "utf8").split("\r\n");
  return csv(
    rawFile.slice(3, rawFile.length).join("\r\n"),
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    const usd = {
      amount: row["USD Amount Transacted (Inclusive of Coinbase Fees)"],
      type: "USD",
    };
    const asset = {
      amount: row["Quantity Transacted"],
      price: row["USD Spot Price at Transaction"],
      type: row["Asset"],
    };
    const isBuy = row["Transaction Type"] === "Buy";
    return ({
      assetsIn: [isBuy ? asset : usd],
      assetsOut: [isBuy ? usd : asset],
      category: "swap",
      date: (new Date(row["Timestamp"])).toISOString(),
      description: "",
      prices: { [asset.type]: row["USD Spot Price at Transaction"] },
      tags: ["coinbase"],
    });
  });
};
