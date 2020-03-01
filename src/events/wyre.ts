import csv from "csv-parse/lib/sync";
import fs from "fs";

import { env } from "../env";
import { DateString, Event } from "../types";
import { Logger } from "../utils";
import { amountsAreClose, mergeFactory } from "./utils";

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

    log.info(event.description);
    return event;
  }).filter(row => !!row);
};

export const mergeWyre = mergeFactory({
  allowableTimeDiff: 15 * 60 * 1000,
  log: new Logger("MergeWyre", env.logLevel),

  mergeEvents: (event: Event, wyreEvent: Event): Event => {

    const wyreTransfer = wyreEvent.transfers[0];
    const mergedTransfers = [];

    for (let j = 0; j < event.transfers.length; j++) {
      const transfer = event.transfers[j];
      if (
        transfer.assetType === wyreTransfer.assetType &&
        amountsAreClose(transfer.quantity, wyreTransfer.quantity)
      ) {
        mergedTransfers.push({
          ...transfer,
          from: wyreTransfer.from.startsWith("external") 
            ? transfer.from
            : wyreTransfer.from,
          to: wyreTransfer.to.startsWith("external")
            ? transfer.to
            : wyreTransfer.to,
        });
      }
      mergedTransfers.push(transfer);
    }

    return {
      ...event,
      sources: Array.from(new Set([...event.sources, ...wyreEvent.sources])),
      tags: Array.from(new Set([...event.tags, ...wyreEvent.tags])),
      transfers: mergedTransfers,
    };
  },

  shouldMerge: (event: Event, wyreEvent: Event): boolean => {
    // Only events w one transfer are eligble to merge w ethTx events.
    if (wyreEvent.transfers.length !== 1) {
      return false;
    }
    const wyreTransfer = wyreEvent.transfers[0];
    // wyreEvent must have one transfer in common w other event
    for (let j = 0; j < event.transfers.length; j++) {
      const transfer = event.transfers[j];
      if (
        transfer.assetType === wyreTransfer.assetType &&
        amountsAreClose(transfer.quantity, wyreTransfer.quantity)
      ) {
        return true;
      }
      if (["USD", "LTC", "BTC"].includes(transfer.assetType)) {
        return false; // Can't merge non-eth coinbase transactions
      }
    }
    return false;
  },
});
