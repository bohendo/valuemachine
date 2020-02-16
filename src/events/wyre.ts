import csv from "csv-parse/lib/sync";
import fs from "fs";

import { Event, InputData, SwapEvent } from "../types";
import { diff, add, sub, round, mul, eq, gt, lt, Logger } from "../utils";

export const formatWyre = (filename: string, logLevel: number): SwapEvent[] => {
  const log = new Logger("SendWyre", logLevel || 3);
  return csv(
    fs.readFileSync(filename, "utf8"),
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    log.debug(`Parsing row ${JSON.stringify(row)}`);
    // Ignore any rows with an invalid timestamp
    if (isNaN((new Date(row["Created At"])).getUTCFullYear())) return null;
    const input = { amount: row["Source Amount"], type: row["Source Currency"] };
    const output = { amount: row["Dest Amount"], type: row["Dest Currency"] };
    const category = row["Type"] === "EXCHANGE" || input.type !== output.type ? "swap" : "transfer";
    const description =
      `${input.amount} ${input.type} -> ${output.amount} ${output.type} sendwire ${category}`;
    log.debug(`${description} (${row["Type"]})`);
    return ({
      assetsIn: [input],
      assetsOut: [output],
      category,
      date: (new Date(row["Created At"])).toISOString(),
      description,
      prices: {}, // Exchange Rate isn't a price, hence not super useful
      tags: ["sendwyre"],
    });
  }).filter(row => !!row);
};
