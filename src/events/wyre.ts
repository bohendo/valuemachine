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
    const event = {
      assetsIn: [],
      assetsOut: [],
      date: (new Date(row["Created At"])).toISOString(),
      prices: {},
      source: "sendwyre",
      tags: [],
    } as Event;
    const output = { amount: row["Source Amount"], type: row["Source Currency"] };
    const input = { amount: row["Dest Amount"], type: row["Dest Currency"] };

    if (row["Type"] === "EXCHANGE") {
      event.from = "sendwyre";
      event.to = "sendwyre";
      event.assetsIn.push(input);
      event.assetsOut.push(output);
    } else if (row["Type"] === "INCOMING") {
      event.from = "external";
      event.to = "sendwyre";
      event.assetsOut.push(output);
      event.tags.push("ignore");
      // bc sendwyre calls SAI DAI..
      if (["DAI", "SAI"].includes(output.type)) {
        event.assetsOut.push({ ...output, type: output.type === "SAI" ? "DAI" : "SAI" });
      }
    } else if (row["Type"] === "OUTGOING") {
      event.from = "sendwyre";
      event.to = "external";
      event.assetsIn.push(input);
      event.tags.push("ignore");
      // bc sendwyre calls SAI DAI..
      if (["DAI", "SAI"].includes(output.type)) {
        event.assetsIn.push({ ...input, type: input.type === "SAI" ? "DAI" : "SAI" });
      }
    }

    event.category = getCategory(event, log);
    event.description = getDescription(event, log);
    log.info(event.description);
    return event;
  }).filter(row => !!row);
};
