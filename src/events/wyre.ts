import csv from "csv-parse/lib/sync";
import fs from "fs";

import { env } from "../env";
import { Event } from "../types";
import { Logger } from "../utils";
import { getDescription } from "./utils";

export const formatWyre = (filename: string): Event[] => {
  const log = new Logger("SendWyre", env.logLevel);
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
      sources: new Set(["sendwyre"]),
      tags: new Set([]),
    } as Event;
    const output = {
      assetType: row["Source Currency"],
      quantity: row["Source Amount"],
    };
    const input = {
      assetType: row["Dest Currency"],
      quantity: row["Dest Amount"],
    };

    if (new Date(event.date).getTime() < new Date("2019-12-02T00:00:00Z").getTime()) {
      input.assetType = input.assetType.replace("DAI", "SAI");
      output.assetType = output.assetType.replace("DAI", "SAI");
      log.debug(`${event.date} is before sendwyre switched, assetType is: ${input.assetType} & ${output.assetType}`);
    }

    if (row["Type"] === "EXCHANGE") {
      event.from = "sendwyre";
      event.to = "sendwyre";
      event.assetsIn.push(input);
      event.assetsOut.push(output);
    } else if (row["Type"] === "INCOMING") {
      event.from = "external";
      event.to = "sendwyre";
      event.assetsOut.push(output);
      event.tags.add("ignore");
    } else if (row["Type"] === "OUTGOING") {
      event.from = "sendwyre";
      event.to = "external";
      event.assetsIn.push(input);
      event.tags.add("ignore");
    }

    event.description = getDescription(event);
    log.info(event.description);
    return event;
  }).filter(row => !!row);
};
