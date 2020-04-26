import { Event, EventSources, ILogger, TransferCategories } from "@finances/types";
import csv from "csv-parse/lib/sync";

import { ContextLogger } from "../utils";

import { assertChrono, mergeFactory } from "./utils";

export const mergeDigitalOceanEvents = (
  oldEvents: Event[],
  digitaloceanData: string,
  lastUpdated,
  logger?: ILogger,
): Event[] => {
  const log = new ContextLogger("DigitalOcean", logger);
  let events = JSON.parse(JSON.stringify(oldEvents));
  const digitaloceanEvents = csv(
    digitaloceanData,
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    const {
      ["description"]: description,
      ["USD"]: quantity,
      ["start"]: date,
    } = row;

    if (new Date(date).getTime() <= lastUpdated) {
      return null;
    }

    const event = {
      date: (new Date(date)).toISOString(),
      description: `Paid digital ocean for ${description}`,
      prices: {},
      sources: [EventSources.DigitalOcean],
      tags: ["f1040sc-L20a"],
      transfers: [],
    };

    event.transfers.push({
      assetType: "USD",
      category: TransferCategories.Transfer,
      from: "digitalocean-account",
      quantity: quantity.replace("$", ""),
      to: "digitalocean",
    });

    return event;
  }).filter(row => !!row);

  log.info(`Loaded ${digitaloceanEvents.length} new events from digitalocean`);

  digitaloceanEvents.forEach((digitaloceanEvent: Event): void => {
    log.info(digitaloceanEvent.description);
    events = mergeFactory({
      allowableTimeDiff: 0,
      log,
      mergeEvents: () => {},
      shouldMerge: () => false,
    })(events, digitaloceanEvent);
  });

  assertChrono(events);
  return events;
};

