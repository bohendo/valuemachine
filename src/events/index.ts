import fs from "fs";

import { env } from "../env";
import { getAddressBook } from "../addressBook";
import { getChainData } from "../chainData";
import { getPrice } from "../priceData";
import { Event, InputData } from "../types";
import { Logger } from "../utils";

import { castCoinbase, mergeCoinbase } from "./coinbase";
import { castEthTx, mergeEthTx } from "./ethTx";
import { castEthCall, mergeEthCall } from "./ethCall";
import { castDefault, mergeDefault } from "./utils";
import { castWyre, mergeWyre } from "./wyre";

const assertChrono = (events: Event[]): void => {
  if (env.mode !== "production") {
    let prev = 0;
    for (const event of events) {
      if (!event || !event.date) {
        throw new Error(`Invalid event detected: ${JSON.stringify(event, null, 2)}`);
      }
      const curr = new Date(event.date).getTime();
      if (curr < prev) {
        throw new Error(`Events out of order: ${event.date} < ${new Date(prev).toISOString()}`);
      }
      prev = curr;
    }
  }
};

export const getFinancialEvents = async (input: InputData): Promise<Event[]> => {
  const log = new Logger("FinancialEvents", env.logLevel);

  let events = [] as Event[];

  if (env.mode === "production") {
    try {
      events = JSON.parse(fs.readFileSync(`${env.outputFolder}/events.json`, "utf8"));
      log.info(`Loaded ${events.length} events from cache`);
      return events;
    } catch (e) {
      log.warn(e.message);
    }
  }

  const addressBook = getAddressBook(input);
  const chainData = await getChainData(addressBook);

  Object.values(chainData.transactions)
    .sort((tx1, tx2) => parseFloat(`${tx1.block}.${tx1.index}`) - parseFloat(`${tx2.block}.${tx2.index}`))
    .map(castEthTx(addressBook))
    .filter(e => !!e)
    .forEach((txEvent: Event): void => {
      events = mergeEthTx(events, txEvent);
      assertChrono(events);
    });

  assertChrono(events);

  log.info(`We have ${events.length} events after parsing eth transactions`);

  log.info(`Processing ${chainData.calls.length} ethCalls`);
  chainData.calls
    .sort((call1, call2) => call1.block - call2.block)
    .map(castEthCall(addressBook, chainData))
    .filter(e => !!e)
    .forEach((callEvent: Event): void => {
      events = mergeEthCall(events, callEvent);
      assertChrono(events);
    });

  assertChrono(events);

  log.info(`We have ${events.length} events after parsing eth calls`);

  for (const source of input.events || []) {
    if (typeof source === "string" && source.endsWith(".csv")) {
      if (source.toLowerCase().includes("coinbase")) {
        castCoinbase(source).forEach((coinbaseEvent: Event): void => {
          events = mergeCoinbase(events, coinbaseEvent);
        });
      } else if (source.toLowerCase().includes("wyre")) {
        castWyre(source).forEach(wyreEvent => {
          events = mergeWyre(events, wyreEvent);
        });
      } else {
        throw new Error(`I don't know how to parse events from ${source}`);
      }
      log.info(`We have ${events.length} events after parsing ${source}`);
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

  fs.writeFileSync(`${env.outputFolder}/events.json`, JSON.stringify(events, null, 2));
  // and one local copy, just for convenience
  fs.writeFileSync(`./events.json`, JSON.stringify(events, null, 2));
  return events;
};
