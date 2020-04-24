import { DateString, Event, EventSources, TransferCategories } from "@finances/types";
import csv from "csv-parse/lib/sync";

import { ContextLogger } from "../utils";
import { ILogger } from "../types";
import { assertChrono, mergeFactory, mergeOffChainEvents, shouldMergeOffChain } from "./utils";

export const mergeWyreEvents = (
  oldEvents: Event[],
  wyreData: string,
  logger?: ILogger,
): Event[] => {
  const log = new ContextLogger("SendWyre", logger);
  let events = JSON.parse(JSON.stringify(oldEvents));
  const wyreEvents = csv(
    wyreData,
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
      description: "",
      prices: {},
      sources: [EventSources.SendWyre],
      tags: [],
      transfers: [],
    } as Event;

    if (txType === "EXCHANGE") {
      event.transfers.push({
        assetType: sourceType,
        category: TransferCategories.SwapOut,
        from: "sendwyre-account",
        quantity: sourceQuantity,
        to: "sendwyre-exchange",
      });
      event.transfers.push({
        assetType: destType,
        category: TransferCategories.SwapIn,
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
        category: TransferCategories.Transfer,
        from: "external-account",
        quantity: destQuantity,
        to: "sendwyre-account",
      });
      event.description = `Deposit ${destQuantity} ${destType} into sendwyre`;

    } else if (txType === "INCOMING" && destType !== sourceType) {
      event.transfers.push({
        assetType: sourceType,
        category: TransferCategories.SwapOut,
        from: "external-account",
        quantity: sourceQuantity,
        to: "sendwyre-exchange",
      });
      event.transfers.push({
        assetType: destType,
        category: TransferCategories.SwapIn,
        from: "sendwyre-exchange",
        quantity: destQuantity,
        to: "sendwyre-account",
      });
      event.description = sourceType === "USD"
        ? `Buy ${destQuantity} ${destType} for ${sourceQuantity} USD on sendwyre`
        : `Sell ${sourceQuantity} ${sourceType} for ${destQuantity} ${destType} on sendwyre`;

    } else if (txType === "OUTGOING" && destType === sourceType) {
      event.transfers.push({
        assetType: destType,
        category: TransferCategories.Transfer,
        from: "sendwyre-account",
        quantity: destQuantity,
        to: "external-account",
      });
      event.description = `Withdraw ${destQuantity} ${destType} out of sendwyre`;

    } else if (txType === "OUTGOING" && destType !== sourceType) {
      event.transfers.push({
        assetType: sourceType,
        category: TransferCategories.SwapOut,
        from: "sendwyre-account",
        quantity: sourceQuantity,
        to: "sendwyre-exchange",
      });
      event.transfers.push({
        assetType: destType,
        category: TransferCategories.SwapIn,
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


  const mergeWyre = mergeFactory({
    allowableTimeDiff: 15 * 60 * 1000,
    log,
    mergeEvents: mergeOffChainEvents,
    shouldMerge: shouldMergeOffChain,
  });

  log.info(`Processing ${wyreEvents.length} new events from wyre`);

  wyreEvents.forEach((wyreEvent: Event): void => {
    log.info(wyreEvent.description);
    events = mergeWyre(events, wyreEvent);
  });

  // The non-zero allowableTimeDiff for exchange merges causes edge cases while insert-sorting
  // edge case is tricky to solve at source, just sort manually ffs
  events = events.sort((e1: Event, e2: Event): number =>
    new Date(e1.date).getTime() - new Date(e2.date).getTime(),
  );
  assertChrono(events);

  return events;
};
