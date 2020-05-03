import { AddressBook, ILogger, AssetTypes, ChainData, Event } from "@finances/types";
import { ContextLogger } from "@finances/utils";
import * as fs from "fs";

import { getPrice } from "../prices";

import { mergeCoinbaseEvents } from "./coinbase";
import { mergeDigitalOceanEvents } from "./digitalocean";
import { mergeWyreEvents } from "./wyre";
import { mergeEthTxEvents } from "./ethTx";
import { mergeEthCallEvents } from "./ethCall";
import { mergeDefaultEvents } from "./utils";

export const getEvents = async (
  addressBook: AddressBook,
  chainData: ChainData,
  cache: any,
  extraEvents: Array<Event | string>,
  logger: ILogger = console,
): Promise<Event[]> => {
  const log = new ContextLogger("GetEvents", logger);

  let events = cache.loadEvents();
  const lastUpdated = events.length !== 0
    ? new Date(events[events.length - 1].date).getTime()
    : 0;

  log.info(`Loaded ${events.length} events from cache, most recent was on: ${
    lastUpdated ? new Date(lastUpdated).toISOString() : "never"
  }`);

  events = mergeEthTxEvents(events, addressBook, chainData, lastUpdated, logger);
  events = mergeEthCallEvents(events, addressBook, chainData, lastUpdated, logger);

  for (const source of extraEvents || []) {
    if (typeof source === "string" && source.endsWith(".csv")) {
      if (source.toLowerCase().includes("coinbase")) {
        events = mergeCoinbaseEvents(events, fs.readFileSync(source, "utf8"), lastUpdated, logger);
      } else if (source.toLowerCase().includes("digital-ocean")) {
        events = mergeDigitalOceanEvents(
          events,
          fs.readFileSync(source, "utf8"),
          lastUpdated,
          logger,
        );
      } else if (source.toLowerCase().includes("wyre")) {
        events = mergeWyreEvents(events, fs.readFileSync(source, "utf8"), lastUpdated, logger);
      } else {
        throw new Error(`I don't know how to parse events from ${source}`);
      }
    } else if (typeof source !== "string") {
      events = mergeDefaultEvents(events, source, lastUpdated);
    }
  }

  log.info(`Attaching price info to events`);
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const assets = Array.from(new Set(event.transfers.map(a => a.assetType)));
    for (let j = 0; j < assets.length; j++) {
      const assetType = assets[j] as AssetTypes;
      if (!event.prices) { event.prices = {}; } // TODO: this should already be done
      if (!event.prices[assetType]) {
        event.prices[assetType] = await getPrice(assetType, event.date, cache, logger);
      }
    }
  }
  log.info(`Event price info is up to date`);

  log.info(`Saving ${events.length} events to cache`);
  let i = 1;
  events.map(event => event.index = i++);
  cache.saveEvents(events);
  return events;
};
