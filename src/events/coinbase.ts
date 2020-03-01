import csv from "csv-parse/lib/sync";
import fs from "fs";

import { env } from "../env";
import { Event } from "../types";
import { Logger } from "../utils";
import { amountsAreClose, getDescription } from "./utils";

export const castCoinbase = (filename: string): Event[] => {
  const log = new Logger("Coinbase", env.logLevel);
  const rawFile = fs.readFileSync(filename, "utf8");
  return csv(
    rawFile,
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    const {
      ["Asset"]: assetType,
      ["Quantity Transacted"]: quantity,
      ["Timestamp"]: date,
      ["Transaction Type"]: txType,
      ["USD Spot Price at Transaction"]: price,
      ["USD Total (inclusive of fees)"]: usdQuantity,
    } = row;

    const event = {
      date: (new Date(date)).toISOString(),
      prices: { [assetType]: price },
      sources: new Set(["coinbase"]),
      tags: new Set(),
      transfers: [],
    } as Event;

    let [from, to] = ["", ""];

    if (txType === "Send") {
      [from, to] = ["coinbase-account", "external-account"];

    } else if (txType === "Receive") {
      [from, to] = ["external-account", "coinbase-account"];

    } else if (txType === "Sell") {
      [from, to] = ["coinbase-account", "coinbase-exchange"];
      event.transfers.push({
        assetType: "USD",
        from: "coinbase-exchange",
        quantity: usdQuantity,
        to: "coinbase-account",
      });

    } else if (txType === "Buy") {
      [from, to] = ["coinbase-exchange", "coinbase-account"];
      event.transfers.push({
        assetType: "USD",
        from: "coinbase-account",
        quantity: usdQuantity,
        to: "coinbase-exchange",
      });
    }

    event.transfers.push({ assetType, from, quantity, to });

    event.description = getDescription(event);
    log.info(event.description);
    return event;
  });
};

export const mergeCoinbase = (events: Event[], cbEvent: Event): Event[] => {
  const log = new Logger("MergeCoinbase", env.logLevel);
  const output = [] as Event[];
  const closeEnough = 15 * 60 * 1000; // 15 minutes
  for (const i = 0; i < events.length; i++) {

    // Are event dates close enough to even consider merging?
    const event = events[i];
    const diff = new Date(cbEvent.date).getTime() - new Date(event.date).getTime();
    if (diff > closeEnough) {
      output.push(event);
      continue;
    } else if (diff < (closeEnough * -1)) {
      output.push(cbEvent);
      output.push(...events.slice(i));
      break;
    }
    log.debug(`Found event that happened ${diff / (1000)} seconds before this coinbase event.`);

    // Only coinbase events w one transfer are eligble to merge w ethTx events.
    if (cbEvent.transfers.length !== 1) {
      if (diff >= 0) {
        output.push(cbEvent);
        output.push(...events.slice(i));
      } else {
        output.push(event);
        output.push(cbEvent);
        output.push(...events.slice(i + 1));
      }
      break;
    }
    const cbTransfer = cbEvent.transfers[0];

    let shouldMerge = false;
    const mergedTransfers = [];
    for (const transfer of event.transfers) {
      if (
        transfer.assetType === cbTransfer.assetType &&
        amountsAreClose(transfer.assetType, cbTransfer.assetType)
      ) {
        shouldMerge = true;
        mergedTransfers.push({
          ...transfer,
          from: cbTransfer.from.startsWith("external") 
            ? transfer.from
            : cbTransfer.from,
          to: cbTransfer.to.startsWith("external")
            ? transfer.to
            : cbTransfer.to,
        });
        output.push(...events.slice(i + 1));
        break;
      }
      mergedTransfers.push(transfer);
    }
    if (shouldMerge) {
      output.push({
        ...event,
        sources: new Set([...event.sources, ...cbEvent.sources]),
        tags: new Set([...event.tags, ...cbEvent.tags]),
        transfers: mergedTransfers,
      });
    }
  }
  return output;
};
