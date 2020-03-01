import csv from "csv-parse/lib/sync";
import fs from "fs";

import { env } from "../env";
import { DateString, Event } from "../types";
import { Logger } from "../utils";
import { amountsAreClose } from "./utils";

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
      sources: new Set(["sendwyre"]),
      tags: new Set([]),
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
        : `Sell ${sourceQuantity} ${sourceType} for ${destQuantity} USD on sendwyre`;

    } else if (txType === "INCOMING") {
      if (destType !== sourceType || destQuantity !== sourceQuantity) {
        throw new Error(`[SendWyre] source & dest should be same for INCOMING txType`);
      }
      event.transfers.push({
        assetType: destType,
        from: "external-account",
        quantity: destQuantity,
        to: "sendwyre-account",
      });
      event.description = `Deposit ${destQuantity} ${destType} into sendwyre`;

    } else if (txType === "OUTGOING") {
      if (destType !== sourceType || destQuantity !== sourceQuantity) {
        throw new Error(`[SendWyre] source & dest should be same for INCOMING txType`);
      }
      event.transfers.push({
        assetType: destType,
        from: "sendwyre-account",
        quantity: destQuantity,
        to: "external-account",
      });
      event.description = `Withdraw ${destQuantity} ${destType} out of sendwyre`;
    }

    log.info(event.description);
    return event;
  }).filter(row => !!row);
};

export const mergeWyre = (events: Event[], wyreEvent: Event): Event[] => {
  const log = new Logger("MergeWyre", env.logLevel);
  const output = [] as Event[];
  const closeEnough = 15 * 60 * 1000; // 15 minutes
  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Are event dates close enough to even consider merging?
    const diff = new Date(wyreEvent.date).getTime() - new Date(event.date).getTime();
    if (diff > closeEnough) {
      output.push(event);
      continue;
    } else if (diff < (closeEnough * -1)) {
      output.push(wyreEvent);
      output.push(...events.slice(i));
      return output;
    }
    log.debug(`Found event that happened ${diff / (1000)} seconds before this one.`);

    // Only events w one transfer are eligble to merge w ethTx events.
    if (wyreEvent.transfers.length !== 1) {
      if (diff >= 0) {
        output.push(wyreEvent);
        output.push(...events.slice(i));
      } else {
        output.push(event);
        output.push(wyreEvent);
        output.push(...events.slice(i + 1));
      }
      return output;
    }
    const wyreTransfer = wyreEvent.transfers[0];

    let shouldMerge = false;
    const mergedTransfers = [];
    for (let j = 0; j < event.transfers.length; j++) {
      const transfer = event.transfers[j];
      if (
        transfer.assetType === wyreTransfer.assetType &&
        amountsAreClose(transfer.assetType, wyreTransfer.assetType)
      ) {
        shouldMerge = true;
        mergedTransfers.push({
          ...transfer,
          from: wyreTransfer.from.startsWith("external") 
            ? transfer.from
            : wyreTransfer.from,
          to: wyreTransfer.to.startsWith("external")
            ? transfer.to
            : wyreTransfer.to,
        });
        mergedTransfers.push(...event.transfers.slice(j + 1));
        break;
      }
      mergedTransfers.push(transfer);
    }
    if (shouldMerge) {
      const mergedEvent = {
        ...event,
        sources: new Set([...event.sources, ...wyreEvent.sources]),
        tags: new Set([...event.tags, ...wyreEvent.tags]),
        transfers: mergedTransfers,
      };
      log.info(`Merged event: ${JSON.stringify(mergedEvent, null, 2)}`);
      output.push(mergedEvent);
      output.push(...events.slice(i + 1));
      return output;
    }
  }
  return output;
};
