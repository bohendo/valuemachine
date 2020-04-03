import csv from "csv-parse/lib/sync";
import fs from "fs";

import { env } from "../env";
import { DateString, Event } from "../types";
import { Logger } from "../utils";
import { mergeFactory, mergeOffChainEvents, shouldMergeOffChain } from "./utils";

export const castWyre = (filename: string): Event[] => {
  const log = new Logger("SendWyre", env.logLevel);
  return csv(
    fs.readFileSync(filename, "utf8"),
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    const {
      ["Created At"]: date,
      ["Dest Amount"]: destQuantity,
      ["Dest Currency"]: rawDestType,
      ["Source Amount"]: sourceQuantity,
      ["Source Currency"]: rawSourceType,
      ["Type"]: txType,
    } = row;

    const beforeDaiMigration = (date: DateString): boolean =>
      new Date(date).getTime() < new Date("2019-12-02T00:00:00Z").getTime();

    const destType = beforeDaiMigration(date) && rawDestType === "DAI" ? "SAI" : rawDestType;
    const sourceType = beforeDaiMigration(date) && rawSourceType === "DAI" ? "SAI" : rawDestType;

    // Ignore any rows with an invalid timestamp
    if (isNaN((new Date(date)).getUTCFullYear())) return null;
    const event = {
      date: (new Date(date)).toISOString(),
      prices: {},
      sources: ["sendwyre"],
      tags: [],
      transfers: [],
    } as Event;

    if (txType === "EXCHANGE") {
      event.transfers.push({
        assetType: sourceType,
        from: "sendwyre-account",
        quantity: sourceQuantity,
        to: "sendwyre-exchange",
      });
      event.transfers.push({
        assetType: destType,
        from: "sendwyre-exchange",
        quantity: destQuantity,
        to: "sendwyre-account",
      });
      event.description = sourceType === "USD"
        ? `Buy ${destQuantity} ${destType} for ${sourceQuantity} USD on sendwyre`
        : `Sell ${sourceQuantity} ${sourceType} for ${destQuantity} ${destType} on sendwyre`;

    } else if (txType === "INCOMING" && destType === sourceType) {
      event.transfers.push({
        assetType: destType,
        from: "external-account",
        quantity: destQuantity,
        to: "sendwyre-account",
      });
      event.description = `Deposit ${destQuantity} ${destType} into sendwyre`;

    } else if (txType === "INCOMING" && destType !== sourceType) {
      event.transfers.push({
        assetType: destType,
        from: "external-account",
        quantity: destQuantity,
        to: "sendwyre-account",
      });
      event.description = sourceType === "USD"
        ? `Buy ${destQuantity} ${destType} for ${sourceQuantity} USD on sendwyre`
        : `Sell ${sourceQuantity} ${sourceType} for ${destQuantity} ${destType} on sendwyre`;

    } else if (txType === "OUTGOING" && destType === sourceType) {
      event.transfers.push({
        assetType: destType,
        from: "sendwyre-account",
        quantity: destQuantity,
        to: "external-account",
      });
      event.description = `Withdraw ${destQuantity} ${destType} out of sendwyre`;

    } else if (txType === "OUTGOING" && destType !== sourceType) {
      event.transfers.push({
        assetType: sourceType,
        from: "sendwyre-account",
        quantity: sourceQuantity,
        to: "sendwyre-exchange",
      });
      event.transfers.push({
        assetType: destType,
        from: "sendwyre-exchange",
        quantity: destQuantity,
        to: "external-account",
      });
      event.description = sourceType === "USD"
        ? `Buy ${destQuantity} ${destType} for ${sourceQuantity} USD on sendwyre`
        : `Sell ${sourceQuantity} ${sourceType} for ${destQuantity} ${destType} on sendwyre`;

    }

    log.debug(event.description);
    return event;
  }).filter(row => !!row);
};

export const mergeWyre = mergeFactory({
  allowableTimeDiff: 15 * 60 * 1000,
  log: new Logger("MergeWyre", env.logLevel),
  mergeEvents: mergeOffChainEvents,
  shouldMerge: shouldMergeOffChain,
});
