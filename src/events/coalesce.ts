import { isHexString, arrayify } from "ethers/utils";
import { env } from "../env";
import { TimestampString, DecimalString, Asset, Event } from "../types";
import { add, diff, div, Logger, lt, mul } from "../utils";
import { getDescription } from "./utils";

const castEvent = (event: any): Event => JSON.parse(JSON.stringify({
  assetsIn: [],
  assetsOut: [],
  prices: {},
  tags: new Set(),
  ...event,
}));

const datesAreClose = (d1: TimestampString, d2: TimestampString): boolean =>
  Math.abs((new Date(d1)).getTime() - (new Date(d2)).getTime()) <= 1000 * 60 * 15;

const amountsAreClose = (a1: DecimalString, a2: DecimalString): boolean =>
  lt(div(mul(diff(a1, a2), "200"), add([a1, a2])), "1");

const dedupAssets = (loa1: Asset[], loa2: Asset[]): Asset[] => {
  const loa = JSON.parse(JSON.stringify(loa1)) as Asset[];
  for (const a2 of loa2) {
    if (loa.find(a => a.assetType === a2.assetType && amountsAreClose(a.quantity, a2.quantity))) {
      continue;
    } else {
      loa.push(a2);
    }
  }
  return loa;
};

const commonAssets = (loa1: Asset[], loa2: Asset[]): Asset[] => {
  const common: Asset[] = [];
  for (let i = 0; i < loa1.length; i++) {
    for (let j = 0; j < loa2.length; j++) {
      if (
        loa1[i].assetType === loa2[j].assetType &&
        amountsAreClose(loa1[i].quantity, loa2[j].quantity)
      ) {
        common.push(JSON.parse(JSON.stringify(loa1[i])));
      }
    }
  }
  return common;
};

const sameEvent = (e1: Event, e2: Event): boolean => (
    // If both events have properly formatted hashes & they match then we're done
    isHexString(e1.hash) && arrayify(e1.hash).length === 32 && 
    isHexString(e2.hash) && arrayify(e2.hash).length === 32 &&
    e1.hash === e2.hash
  ) || (
    // Needs to have happened at about the same time
    datesAreClose(e1.date, e2.date)
  ) && (
    // Needs to have at least 1 asset in common
    commonAssets(e1.assetsIn, e2.assetsIn).length > 0 ||
    commonAssets(e1.assetsOut, e2.assetsOut).length > 0
  ) && (
    // If one event deals w USD, it can't be merged w any events from ethereum
    (
      e1.assetsIn.concat(e1.assetsOut).find(a => a.assetType === "USD")
        ? (!e2.sources.has("ethTx") || !e2.sources.has("ethCall"))
        : true
    ) && (
      e2.assetsIn.concat(e2.assetsOut).find(a => a.assetType === "USD")
        ? (!e1.sources.has("ethTx") || !e1.sources.has("ethCall"))
        : true
    )
  );

const mergeEvents = (e1: Event, e2: Event): Event => {
  const merged = {} as Event;
  const prefer = (source: string, yea: boolean, key: string, e1: Event, e2: Event): string =>
    (e1.sources.has(source)) === yea ? (e1[key] || e2[key]) :
    (e2.sources.has(source)) === yea ? (e2[key] || e1[key]) :
    (e1[key] || e2[key]);
  merged.assetsIn = e1.sources.has("ethTx")
    ? dedupAssets(e1.assetsIn, e2.assetsIn)
    : dedupAssets(e2.assetsIn, e1.assetsIn);
  merged.assetsOut = e1.sources.has("ethTx")
    ? dedupAssets(e1.assetsOut, e2.assetsOut)
    : dedupAssets(e2.assetsOut, e1.assetsOut);
  merged.date = prefer("ethTx", true, "date", e1, e2);
  merged.from = prefer("ethTx", false, "from", e1, e2);
  merged.hash = prefer("ethTx", true, "hash", e1, e2);
  merged.prices = e1.prices || e2.prices;
  merged.sources = new Set([...e1.sources, ...e2.sources]);
  merged.tags = new Set([...e1.tags, ...e2.tags]);
  merged.to = prefer("ethTx", false, "to", e1, e2);
  merged.description = getDescription(merged);
  return merged;
};

export const coalesce = (oldEvents: Event[], newEvents: Partial<Event>[]): Event[] => {
  const log = new Logger("Coalesce", env.logLevel);
  const consolidated = [] as number[];
  const events = [] as Event[];
  for (let oldI = 0; oldI < oldEvents.length; oldI++) {
    let mergedE = castEvent(oldEvents[oldI]);
    for (let newI = 0; newI < newEvents.length; newI++) {
      const newE = castEvent(newEvents[newI]);
      if (consolidated.includes(newI)) { continue; }
      if (mergedE.hash && newE.hash && mergedE.hash !== newE.hash) { continue; }
      if (sameEvent(mergedE, newE)) {
        mergedE = mergeEvents(mergedE, newE);
        log.info(`Merged event "${newE.description}" into "${mergedE.description}"`);
        consolidated.push(newI);
      }
    }
    events.push(mergedE);
  }
  for (let newI = 0; newI < newEvents.length; newI++) {
    if (!consolidated.includes(newI)) {
      log.debug(`Adding unmerged event to output as-is: ${newEvents[newI].description}`);
      events.push(castEvent(newEvents[newI]));
    } else {
      log.debug(`Event merged into another, skipping: ${newEvents[newI].description}`);
    }
  }
  return events;
};
