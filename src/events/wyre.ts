import csv from "csv-parse/lib/sync";
import fs from "fs";

import { Event } from "../types";
import { Logger } from "../utils";

export const formatWyre = (filename: string, logLevel: number): Event[] => {
  const log = new Logger("SendWyre", logLevel || 3);
  return csv(
    fs.readFileSync(filename, "utf8"),
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    log.debug(`Parsing row ${JSON.stringify(row)}`);
    // Ignore any rows with an invalid timestamp
    if (isNaN((new Date(row["Created At"])).getUTCFullYear())) return null;
    const output = { amount: row["Source Amount"], type: row["Source Currency"] };
    const input = { amount: row["Dest Amount"], type: row["Dest Currency"] };
    const category = row["Type"] === "EXCHANGE" || input.type !== output.type ? "swap" : "transfer";
    const description =
      `sendwyre ${category} of ${output.amount} ${output.type} -> ${input.amount} ${input.type}`;
    log.debug(`${description} (${row["Type"]})`);
    return ({
      assetsIn: [input],
      assetsOut: [output],
      category,
      date: (new Date(row["Created At"])).toISOString(),
      description,
      prices: {}, // Exchange Rate isn't a price, hence not super useful
      source: "sendwyre",
      tags: [],
    });
  }).filter(row => !!row);
};
