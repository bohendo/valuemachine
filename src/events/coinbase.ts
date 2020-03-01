import csv from "csv-parse/lib/sync";
import fs from "fs";

import { env } from "../env";
import { Event } from "../types";
import { Logger } from "../utils";
import { amountsAreClose, mergeFactory } from "./utils";

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
      sources: ["coinbase"],
      tags: [],
      transfers: [],
    } as Event;

    let [from, to] = ["", ""];

    if (txType === "Send") {
      [from, to] = ["coinbase-account", "external-account"];
      event.description = `Withdraw ${quantity} ${assetType} out of coinbase`;

    } else if (txType === "Receive") {
      [from, to] = ["external-account", "coinbase-account"];
      event.description = `Deposit ${quantity} ${assetType} into coinbase`;

    } else if (txType === "Sell") {
      [from, to] = ["coinbase-account", "coinbase-exchange"];
      event.transfers.push({
        assetType: "USD",
        from: "coinbase-exchange",
        quantity: usdQuantity,
        to: "coinbase-account",
      });
      event.description = `Sell ${quantity} ${assetType} for ${usdQuantity} USD on coinbase`;

    } else if (txType === "Buy") {
      [from, to] = ["coinbase-exchange", "coinbase-account"];
      event.transfers.push({
        assetType: "USD",
        from: "coinbase-account",
        quantity: usdQuantity,
        to: "coinbase-exchange",
      });
      event.description = `Buy ${quantity} ${assetType} for ${usdQuantity} USD on coinbase`;
    }

    event.transfers.push({ assetType, from, quantity, to });

    log.info(event.description);
    return event;
  });
};

export const mergeCoinbase = mergeFactory({
  allowableTimeDiff: 15 * 60 * 1000,
  log: new Logger("MergeCoinbase", env.logLevel),

  mergeEvents: (event: Event, cbEvent: Event): Event => {

    const cbTransfer = cbEvent.transfers[0];
    const mergedTransfers = [];

    for (let j = 0; j < event.transfers.length; j++) {
      const transfer = event.transfers[j];
      if (
        transfer.assetType === cbTransfer.assetType &&
        amountsAreClose(transfer.quantity, cbTransfer.quantity)
      ) {
        mergedTransfers.push({
          ...transfer,
          from: cbTransfer.from.startsWith("external") 
            ? transfer.from
            : cbTransfer.from,
          to: cbTransfer.to.startsWith("external")
            ? transfer.to
            : cbTransfer.to,
        });
      }
      mergedTransfers.push(transfer);
    }

    return {
      ...event,
      sources: Array.from(new Set([...event.sources, ...cbEvent.sources])),
      tags: Array.from(new Set([...event.tags, ...cbEvent.tags])),
      transfers: mergedTransfers,
    };
  },

  shouldMerge: (event: Event, cbEvent: Event): boolean => {
    // Only events w one transfer are eligble to merge w ethTx events.
    if (cbEvent.transfers.length !== 1) {
      return false;
    }
    const cbTransfer = cbEvent.transfers[0];
    // cbEvent must have one transfer in common w other event
    for (let j = 0; j < event.transfers.length; j++) {
      const transfer = event.transfers[j];
      if (
        transfer.assetType === cbTransfer.assetType &&
        amountsAreClose(transfer.quantity, cbTransfer.quantity)
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
