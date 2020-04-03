import { getAddressBook } from "../addressBook";
import { loadEvents, saveEvents } from "../cache";
import { getChainData } from "../chainData";
import { env } from "../env";
import { getPrice } from "../prices";
import { Event, InputData } from "../types";
import { Logger } from "../utils";

import { castCoinbase, mergeCoinbase } from "./coinbase";
import { castEthTx, mergeEthTx } from "./ethTx";
import { castEthCall, mergeEthCall } from "./ethCall";
import { assertChrono, castDefault, mergeDefault } from "./utils";
import { castWyre, mergeWyre } from "./wyre";

export const getEvents = async (input: InputData): Promise<Event[]> => {
  const log = new Logger("FinancialEvents", env.logLevel);
  const addressBook = getAddressBook(input);
  const chainData = await getChainData(addressBook);

  let events = loadEvents();
  const latestCachedEvent = events.length !== 0
    ? new Date(events[events.length - 1].date).getTime()
    : 0;

  log.info(`Loaded ${events.length} events from cache, most recent was on ${
    new Date(latestCachedEvent).toISOString()
  }`);

  // returns true if new
  const onlyNew = (data: any): boolean =>
    new Date(data.timestamp || data.date).getTime() - latestCachedEvent > 0;

  const newEthTxs = Object.values(chainData.transactions).filter(onlyNew);
  log.info(`Processing ${newEthTxs.length} new ethereum transactions..`);
  newEthTxs
    .sort((tx1, tx2) => parseFloat(`${tx1.block}.${tx1.index}`) - parseFloat(`${tx2.block}.${tx2.index}`))
    .map(castEthTx(addressBook))
    .forEach((txEvent: Event): void => { events = mergeEthTx(events, txEvent); });
  assertChrono(events);

  const newEthCalls = chainData.calls.filter(onlyNew);
  log.info(`Processing ${newEthCalls.length} new internal ethereum calls..`);
  newEthCalls
    .sort((call1, call2) => call1.block - call2.block)
    .map(castEthCall(addressBook, chainData))
    .filter(e => !!e)
    .forEach((callEvent: Event): void => { events = mergeEthCall(events, callEvent); });
  assertChrono(events);

  for (const source of input.events || []) {
    if (typeof source === "string" && source.endsWith(".csv")) {
      if (source.toLowerCase().includes("coinbase")) {
        const newCoinbaseEvents = castCoinbase(source).filter(onlyNew);
        log.info(`Processing ${newCoinbaseEvents.length} new coinbase events`);
        newCoinbaseEvents.forEach((coinbaseEvent: Event): void => {
          events = mergeCoinbase(events, coinbaseEvent);
        });
      } else if (source.toLowerCase().includes("wyre")) {
        const newWyreEvents = castWyre(source).filter(onlyNew);
        log.info(`Processing ${newWyreEvents.length} new wyre events`);
        newWyreEvents.forEach(wyreEvent => {
          events = mergeWyre(events, wyreEvent);
        });
      } else {
        throw new Error(`I don't know how to parse events from ${source}`);
      }
    } else if (typeof source !== "string") {
      events = mergeDefault(events, castDefault(source));
    }
  }

  // The non-zero allowableTimeDiff for exchange merges causes edge cases while insert-sorting
  // edge case is tricky to solve at source, just sort manually ffs
  events = events.sort((e1: Event, e2: Event): number =>
    new Date(e1.date).getTime() - new Date(e2.date).getTime(),
  );
  assertChrono(events);

  log.info(`Attaching price info to events`);
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const assets = Array.from(new Set(event.transfers.map(a => a.assetType)));
    for (let j = 0; j < assets.length; j++) {
      const assetType = assets[j];
      if (!event.prices) { event.prices = {}; } // TODO: this should already be done
      if (!event.prices[assetType]) {
        event.prices[assetType] = await getPrice(assetType, event.date);
      }
    }
  }
  log.info(`Event price info is up to date`);

  assertChrono(events);
  events.forEach(event => {
    ["date", "description", "prices", "sources", "tags", "transfers"].forEach(required => {
      if (!event[required]) {
        throw new Error(`Event doesn't have a ${required}: ${JSON.stringify(event, null, 2)}`);
      }
    });
    event.transfers.forEach(transfer => {
      if (transfer.from.match(/[A-Z]/)) {
        throw new Error(`Event has uppercase letters in transfer.from: ${
          JSON.stringify(event, null, 2)
        }`);
      }
      if (transfer.to.match(/[A-Z]/)) {
        throw new Error(`Event has uppercase letters in transfer.to: ${
          JSON.stringify(event, null, 2)
        }`);
      }
    });
  });

  log.info(`Saving ${events.length} events to cache`);
  saveEvents(events);
  return events;
};
