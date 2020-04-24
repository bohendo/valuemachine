import { Event, EventSources, TransferCategories } from "@finances/types";
import csv from "csv-parse/lib/sync";

import { ILogger } from "../types";
import { ContextLogger } from "../utils";
import { assertChrono, mergeFactory, mergeOffChainEvents, shouldMergeOffChain } from "./utils";

export const mergeCoinbaseEvents = (
  oldEvents: Event[],
  coinbaseData: string,
  lastUpdated,
  logger?: ILogger,
): Event[] => {
  const log = new ContextLogger("Coinbase", logger);
  let events = JSON.parse(JSON.stringify(oldEvents));
  const coinbaseEvents = csv(
    coinbaseData,
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

    if (new Date(date).getTime() <= lastUpdated) {
      return null;
    }

    const event = {
      date: (new Date(date)).toISOString(),
      prices: { [assetType]: price },
      sources: [EventSources.Coinbase],
      tags: [],
      transfers: [],
    } as Event;

    let [from, to, category] = ["", "", TransferCategories.Transfer as TransferCategories];

    if (txType === "Send") {
      [from, to, category] = ["coinbase-account", "external-account", TransferCategories.Transfer];
      event.description = `Withdraw ${quantity} ${assetType} out of coinbase`;

    } else if (txType === "Receive") {
      [from, to, category] = ["external-account", "coinbase-account", TransferCategories.Transfer];
      event.description = `Deposit ${quantity} ${assetType} into coinbase`;

    } else if (txType === "Sell") {
      [from, to, category] = ["coinbase-account", "coinbase-exchange", TransferCategories.SwapOut];
      event.transfers.push({
        assetType: "USD",
        category: TransferCategories.SwapIn,
        from: "coinbase-exchange",
        quantity: usdQuantity,
        to: "coinbase-account",
      });
      event.description = `Sell ${quantity} ${assetType} for ${usdQuantity} USD on coinbase`;

    } else if (txType === "Buy") {
      [from, to, category] = ["coinbase-exchange", "coinbase-account", TransferCategories.SwapIn];
      event.transfers.push({
        assetType: "USD",
        category: TransferCategories.SwapOut,
        from: "coinbase-account",
        quantity: usdQuantity,
        to: "coinbase-exchange",
      });
      event.description = `Buy ${quantity} ${assetType} for ${usdQuantity} USD on coinbase`;
    }

    event.transfers.push({ assetType, category, from, quantity, to });

    log.debug(event.description);
    return event;
  }).filter(row => !!row);

  log.info(`Processing ${coinbaseEvents.length} new events from coinbase`);

  coinbaseEvents.forEach((coinbaseEvent: Event): void => {
    log.info(coinbaseEvent.description);
    events = mergeFactory({
      allowableTimeDiff: 15 * 60 * 1000,
      log,
      mergeEvents: mergeOffChainEvents,
      shouldMerge: shouldMergeOffChain,
    })(events, coinbaseEvent);
  });

  // The non-zero allowableTimeDiff for exchange merges causes edge cases while insert-sorting
  // edge case is tricky to solve at source, just sort manually ffs
  events = events.sort((e1: Event, e2: Event): number =>
    new Date(e1.date).getTime() - new Date(e2.date).getTime(),
  );
  assertChrono(events);

  return events;
};

