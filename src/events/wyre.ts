import csv from "csv-parse/lib/sync";
import fs from "fs";

import { Event, InputData, SwapEvent } from "../types";
import { getDateString, diff, add, sub, round, mul, eq, gt, lt } from "../utils";

export const formatWyre = (filename: string): SwapEvent[] => {
  return csv(
    fs.readFileSync(filename, "utf8"),
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    // Ignore any rows with an invalid timestamp
    if (!getDateString(new Date(row["Created At"]))) return null;
    // Ignore any transfers into Wyre account
    if (row["Source Currency"] === row["Dest Currency"]) return null;
    return ({
      assetsIn: [{ amount: row["Dest Amount"], type: row["Dest Currency"] }],
      assetsOut: [{ amount: row["Source Amount"], type: row["Source Currency"] }],
      category: "swap",
      date: getDateString(new Date(row["Created At"])),
      description: "",
      prices: { amount: row["Exchange Rate"], type: row["Dest Currency"] },
      tags: ["sendwyre"],
    });
  }).filter(row => !!row);
};
