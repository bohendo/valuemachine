import { Event } from "../types";
import { dedupAssets, commonAssets } from "../utils";

// inputs are ISO 8601 format date strings
const datesAreClose = (d1: string, d2: string): boolean =>
  Math.abs((new Date(d1)).getTime() - (new Date(d2)).getTime()) <= 1000 * 60 * 30;

// If there's an address & it's in our addressBook then it should match the source or self
const addressIsOk = (address: string | null | undefined, source: string): boolean =>
  (address ? (
    address.startsWith("0x") ||
    address.startsWith("self") ||
    address.startsWith(source.substring(0,6))
  ) : true);

const sameEvent = (e1: Event, e2: Event): boolean =>
  e1.source !== e2.source &&
  datesAreClose(e1.date, e2.date) && (
    commonAssets(e1.assetsIn, e2.assetsIn).length > 0 ||
    commonAssets(e1.assetsOut, e2.assetsOut).length > 0
  ) && (
    addressIsOk(e1.to, e2.source) &&
    addressIsOk(e2.to, e1.source) &&
    addressIsOk(e1.from, e2.source) &&
    addressIsOk(e2.from, e1.source)
  );

const mergeEvents = (e1: Event, e2: Event): Event => {
  const merged = {} as Event;
  const prefer = (source: string, yea: boolean, key: string, e1: Event, e2: Event): string =>
    (e1.source === source) === yea ? (e1[key] || e2[key]) :
    (e2.source === source) === yea ? (e2[key] || e1[key]) :
    (e1[key] || e2[key]);
  merged.assetsIn = dedupAssets(e1.assetsIn, e2.assetsIn);
  merged.assetsOut = dedupAssets(e1.assetsOut, e2.assetsOut);
  merged.category = prefer("ethereum", false, "category", e1, e2);
  merged.date = prefer("ethereum", true, "date", e1, e2);
  merged.description = prefer("ethereum", true, "description", e1, e2);
  merged.from = prefer("ethereum", false, "from", e1, e2);
  merged.hash = prefer("ethereum", true, "hash", e1, e2);
  merged.source = [...e1.source.split("+"), ...e2.source.split("+")].sort().join("+");
  merged.to = prefer("ethereum", false, "to", e1, e2);
  return merged;
};

export const coalesce = (oldEvents: Event[], newEvents: Event[]): Event[] => {
  const consolidated = [] as number[];
  const events = [] as Event[];
  for (let oldI = 0; oldI < oldEvents.length; oldI++) {
    let mergedE = oldEvents[oldI];
    for (let newI = 0; newI < newEvents.length; newI++) {
      const newE = newEvents[newI];
      if (consolidated.includes(newI)) { continue; }
      if (mergedE.hash && newE.hash && mergedE.hash !== newE.hash) { continue; }
      if (sameEvent(mergedE, newE)) {
        mergedE = mergeEvents(mergedE, newE);
        console.log(`Merged event "${mergedE.description}" with "${newE.description}"`);
        consolidated.push(newI);
      }
    }
    events.push(mergedE);
  }
  for (let newI = 0; newI < newEvents.length; newI++) {
    if (!consolidated.includes(newI)) {
      events.push(newEvents[newI]);
    }
  }
  return events;
};
