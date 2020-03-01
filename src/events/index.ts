import { env } from "../env";
import { fetchPrice } from "../fetchPrice";
import { getAddressBook } from "../addressBook";
import { Event, InputData } from "../types";
import { Logger } from "../utils";

import { fetchChainData } from "./fetchChainData";

import { castCoinbase, mergeCoinbase } from "./coinbase";
import { castEthTx } from "./ethTx";
import { castEthCall, mergeEthCall } from "./ethCall";
import { castWyre, mergeWyre } from "./wyre";

const castDefault = (event: Partial<Event>): Partial<Event> => ({
  prices: {},
  sources: new Set(["personal"]),
  tags: new Set(),
  transfers: [],
  ...event,
});

const mergeDefault = (events: Event[], input: Partial<Event>): Event[] => {
  const output = [] as Event[];
  for (const i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.hash && input.hash && event.hash === input.hash) {
      output.push({
        ...event,
        sources: new Set([...event.sources, ...input.sources]),
        tags: new Set([...event.tags, ...input.tags]),
      });
      break;
    }
    output.push(event);
  }
  return output;
};

const getPrice = async (asset: string, date: string): Promise<string> =>
  ["USD", "DAI", "SAI"].includes(asset)
    ? "1"
    : ["ETH", "WETH"].includes(asset)
      ? await fetchPrice("ETH", date)
      : await fetchPrice(asset, date);

export const getFinancialEvents = async (input: InputData): Promise<Event[]> => {
  const log = new Logger("FinancialEvents", env.logLevel);
  const addressBook = getAddressBook(input);

  const chainData = await fetchChainData(addressBook);

  let events = chainData.transactions.map(castEthTx(addressBook)).filter(e => !!e);
  log.info(`We have ${events.length} events after parsing eth transactions`);

  chainData.calls.map(castEthCall(addressBook)).filter(e => !!e).forEach(callEvent => {
    events = mergeEthCall(events, callEvent);
  });
  log.info(`We have ${events.length} events after parsing eth calls`);

  if (events.length > 0) {
    throw new Error(`Stop early to debug`);
  }

  for (const source of input.events || []) {
    if (typeof source === "string" && source.endsWith(".csv")) {
      if (source.toLowerCase().includes("coinbase")) {
        castCoinbase(source).forEach(coinbaseEvent => {
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

  events = await Promise.all(events.map(async (event: Event): Promise<Event> => {
    const getType = (a): string => a.assetType;
    const assets = new Set(event.assetsIn.map(getType).concat(event.assetsOut.map(getType)));
    assets.forEach(async (assetType): Promise<void> => {
      if (!event.prices[assetType]) {
        event.prices[assetType] = await getPrice(assetType, event.date);
      }
    });
    return event;
  }));

  return events;
};
