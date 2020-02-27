import csv from "csv-parse/lib/sync";
import fs from "fs";

import { Event } from "../types";
import { Logger } from "../utils";
import { getCategory, getDescription } from "./utils";

export const formatWyre = (filename: string, logLevel: number): Event[] => {
  const log = new Logger("SendWyre", logLevel || 3);
  return csv(
    fs.readFileSync(filename, "utf8"),
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    // Ignore any rows with an invalid timestamp
    if (isNaN((new Date(row["Created At"])).getUTCFullYear())) return null;
    const output = { amount: row["Source Amount"], type: row["Source Currency"] };
    const input = { amount: row["Dest Amount"], type: row["Dest Currency"] };
    const event = {
      assetsIn: [input],
      assetsOut: [output],
      date: (new Date(row["Created At"])).toISOString(),
      prices: {}, // Exchange Rate isn't a price, hence not super useful
      source: "sendwyre",
      tags: [],
    } as Event;
    event.category = getCategory(event, log);
    event.description = getDescription(event, log);
    log.debug(event.description);
    return event;
  }).filter(row => !!row);
};
