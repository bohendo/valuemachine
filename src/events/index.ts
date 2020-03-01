import { env } from "../env";
import { fetchPrice } from "../fetchPrice";
import { getAddressBook } from "../addressBook";
import { Event, InputData } from "../types";
import { assetListsEq, Logger } from "../utils";

import { coalesce } from "./coalesce";
import { formatCoinbase } from "./coinbase";
import { fetchChainData } from "./fetchChainData";
import { parseEthTxFactory, parseEthCallFactory } from "./parseEthTx";
import { formatWyre } from "./wyre";

const getPrice = async (asset: string, date: string): Promise<string> =>
  ["USD", "DAI", "SAI"].includes(asset)
    ? "1"
    : ["ETH", "WETH"].includes(asset)
      ? await fetchPrice("ETH", date)
      : await fetchPrice(asset, date);

export const getFinancialEvents = async (input: InputData): Promise<Event[]> => {
  const log = new Logger("FinancialEvents", env.logLevel);
  let events: Event[] = [];

  const chainData = await fetchChainData(getAddressBook(input));

  // Multiple calls can come from the same transaction
  const callEvents = chainData.calls.map(parseEthCallFactory(input)).filter(e => !!e) as Event[];
  // Coalesce one at a time to merge duplicates
  for (const call of callEvents) {
    events = coalesce(events, [call]);
  }

  log.info(`Found ${callEvents.length} events (${events.length} total) from ${Object.keys(chainData.calls).length} ethereum calls`);

  const transactionEvents =
    Object.values(chainData.transactions).map(parseEthTxFactory(input)).filter(e => !!e) as Event[];

  events = coalesce(events, transactionEvents);

  log.info(`Found ${transactionEvents.length} events (${events.length} total) from ${Object.keys(chainData.transactions).length} ethereum txs`);

  for (const event of input.events || []) {
    if (typeof event === "string" && event.endsWith(".csv")) {
      if (event.toLowerCase().includes("coinbase")) {
        const coinbaseEvents = formatCoinbase(event);
        events = coalesce(events, coinbaseEvents);
        log.info(`Found ${coinbaseEvents.length} events (${events.length} total) from coinbase: ${event}`);
      } else if (event.toLowerCase().includes("wyre")) {
        const wyreEvents = formatWyre(event);
        events = coalesce(events, wyreEvents);
        log.info(`Found ${wyreEvents.length} events (${events.length} total) from sendwyre: ${event}`);
      } else {
        throw new Error(`I don't know how to parse events from ${event}`);
      }
    } else if (typeof event !== "string") {
      events = coalesce(events, [{ sources: new Set(["personal"]), ...(event as Partial<Event>) }]);
    }
  }

  events = events.filter(
    event => !assetListsEq(event.assetsIn, event.assetsOut) && !event.tags.has("ignore"),
  );
  log.info(`Filtered out useless events, we're left with ${events.length}`);

  // Put events in chronological order
  events = events.sort(
    (e1, e2) => new Date(e1.date).getTime() - new Date(e2.date).getTime(),
  );

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
