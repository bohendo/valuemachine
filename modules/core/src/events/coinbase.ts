import { Event, EventSources, TransferTags } from "@finances/types";
import csv from "csv-parse/lib/sync";
import fs from "fs";

import { env } from "../env";
import { Logger } from "../utils";
import { mergeFactory, mergeOffChainEvents, shouldMergeOffChain } from "./utils";

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
      sources: [EventSources.Coinbase],
      tags: [],
      transfers: [],
    } as Event;

    let [from, to, tags] = ["", "", []];

    if (txType === "Send") {
      [from, to, tags] = ["coinbase-account", "external-account", []];
      event.description = `Withdraw ${quantity} ${assetType} out of coinbase`;

    } else if (txType === "Receive") {
      [from, to, tags] = ["external-account", "coinbase-account", []];
      event.description = `Deposit ${quantity} ${assetType} into coinbase`;

    } else if (txType === "Sell") {
      [from, to, tags] = ["coinbase-account", "coinbase-exchange", [TransferTags.SwapOut]];
      event.transfers.push({
        assetType: "USD",
        from: "coinbase-exchange",
        quantity: usdQuantity,
        tags: [TransferTags.SwapIn],
        to: "coinbase-account",
      });
      event.description = `Sell ${quantity} ${assetType} for ${usdQuantity} USD on coinbase`;

    } else if (txType === "Buy") {
      [from, to, tags] = ["coinbase-exchange", "coinbase-account", [TransferTags.SwapIn]];
      event.transfers.push({
        assetType: "USD",
        from: "coinbase-account",
        quantity: usdQuantity,
        tags: [TransferTags.SwapOut],
        to: "coinbase-exchange",
      });
      event.description = `Buy ${quantity} ${assetType} for ${usdQuantity} USD on coinbase`;
    }

    event.transfers.push({ assetType, from, quantity, tags, to });

    log.debug(event.description);
    return event;
  });
};

export const mergeCoinbase = mergeFactory({
  allowableTimeDiff: 15 * 60 * 1000,
  log: new Logger("MergeCoinbase", env.logLevel),
  mergeEvents: mergeOffChainEvents,
  shouldMerge: shouldMergeOffChain,
});
