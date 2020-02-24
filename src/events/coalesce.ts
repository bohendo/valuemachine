import { isHexString, arrayify } from "ethers/utils";
import { Asset, Event } from "../types";
import { addAssets, assetsEq, round } from "../utils";

// inputs are ISO 8601 format date strings
const datesAreClose = (d1: string, d2: string): boolean =>
  Math.abs((new Date(d1)).getTime() - (new Date(d2)).getTime()) <= 1000 * 60 * 15;

const dedupAssets = (loa1: Asset[], loa2: Asset[]): Asset[] => {
  const loa = JSON.parse(JSON.stringify(loa1)) as Asset[];
  for (const a2 of loa2) {
    if (loa.find(a => assetsEq(a, a2))) {
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
      if (assetsEq(loa1[i], loa2[j])) {
        common.push(JSON.parse(JSON.stringify(loa1[i])));
      }
    }
  }
  return common;
};

/*
// If there's an address & it's in our addressBook then it should match the source or self
const addressIsOk = (address: string | null | undefined, source: string): boolean => {
  const res = (address ? (
    address.startsWith("0x") ||
    address.startsWith("self") ||
    address.startsWith(source.substring(0,6))
  ) : true);
  return res;
};
*/

const sameEvent = (e1: Event, e2: Event): boolean => (
    // If both events have properly formatted hashes & they match then we're done
    isHexString(e1.hash) && arrayify(e1.hash).length === 32 && 
    isHexString(e2.hash) && arrayify(e2.hash).length === 32 &&
    e1.hash === e2.hash
  ) || (
    // Categories should be compatible (transfer can match either income or expense)
    e1.category === e2.category || (
      (e1.category === "transfer" && (e2.category === "income" || e2.category === "expense")) ||
      (e2.category === "transfer" && (e1.category === "income" || e1.category === "expense"))
    )
  ) && (
    // Needs to have happened at about the same time
    datesAreClose(e1.date, e2.date)
  ) && (
    // Needs to have at least 1 asset in common
    commonAssets(e1.assetsIn, e2.assetsIn).length > 0 ||
    commonAssets(e1.assetsOut, e2.assetsOut).length > 0
  ) && (
    // If one event deals w USD, it can't be merged w any events from ethereum
    (
      e1.assetsIn.concat(e1.assetsOut).find(a => a.type === "USD")
        ? !e2.source.includes("eth")
        : true
    ) && (
      e2.assetsIn.concat(e2.assetsOut).find(a => a.type === "USD")
        ? !e1.source.includes("eth")
        : true
    )
  );

const mergeEvents = (e1: Event, e2: Event): Event => {
  const merged = {} as Event;
  const prefer = (source: string, yea: boolean, key: string, e1: Event, e2: Event): string =>
    (e1.source.startsWith(source)) === yea ? (e1[key] || e2[key]) :
    (e2.source.startsWith(source)) === yea ? (e2[key] || e1[key]) :
    (e1[key] || e2[key]);
  merged.assetsIn = dedupAssets(e1.assetsIn, e2.assetsIn);
  merged.assetsOut = dedupAssets(e1.assetsOut, e2.assetsOut);
  merged.date = prefer("eth", true, "date", e1, e2);
  merged.from = prefer("eth", false, "from", e1, e2);
  merged.hash = prefer("eth", true, "hash", e1, e2);
  merged.prices = e1.prices || e2.prices;
  merged.source = Array.from(new Set([
    ...e1.source.split("+"),
    ...e2.source.split("+"),
  ])).sort().join("+");
  merged.tags = e1.tags.concat(e2.tags);
  merged.to = prefer("eth", false, "to", e1, e2);
  merged.description = prefer("eth", true, "description", e1, e2);
  merged.category = prefer("eth", false, "category", e1, e2);

  // TODO: dedup this logic
  const income = addAssets(merged.assetsIn).map(a => `${round(a.amount)} ${a.type}`).join(", ");
  const expense = addAssets(merged.assetsOut).map(a => `${round(a.amount)} ${a.type}`).join(", ");
  if (merged.assetsIn.length === 0 && merged.assetsOut.length === 0) {
    return null;
  } else if (merged.assetsIn.length !== 0 && merged.assetsOut.length === 0) {
    merged.category = merged.tags.includes("cdp") ? "borrow" : "income";
    merged.description = `${merged.category} of ${income} from ${merged.from}`;
  } else if (merged.assetsIn.length === 0 && merged.assetsOut.length !== 0) {
    merged.category = merged.tags.includes("cdp") ? "repayment" : "expense";
    merged.description = `${merged.category} of ${expense} to ${merged.to}`;
  } else if (merged.assetsIn.length !== 0 && merged.assetsOut.length !== 0) {
    merged.category = "swap";
    merged.description = `${merged.category} of ${expense} for ${income}`;
  }

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
        console.log(`Merged event "${newE.description}" into "${mergedE.description}"`);
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
