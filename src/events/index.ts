import { Event, InputData } from "../types";
import { Logger } from "../utils";
import { assetListsEq } from "../utils";

import { parseEthTxFactory, parseEthCallFactory } from "./parseEthTx";
import { fetchChainData } from "./fetchChainData";
import { formatCoinbase } from "./coinbase";
import { formatWyre } from "./wyre";
import { coalesce } from "./coalesce";

export const getFinancialEvents = async (input: InputData): Promise<Event[]> => {
  const log = new Logger("FinancialEvents", input.logLevel);
  let events: Event[] = [];

  const chainData = await fetchChainData(input);

  const callEvents = chainData.calls.map(parseEthCallFactory(input)).filter(e => !!e) as Event[];

  events = coalesce(events, callEvents, input.logLevel);

  log.info(`Found ${callEvents.length} events (${events.length} total) from ${Object.keys(chainData.calls).length} ethereum calls`);

  const transactionEvents =
    Object.values(chainData.transactions).map(parseEthTxFactory(input)).filter(e => !!e) as Event[];

  events = coalesce(events, transactionEvents, input.logLevel);

  log.info(`Found ${transactionEvents.length} events (${events.length} total) from ${Object.keys(chainData.transactions).length} ethereum txs`);

  for (const event of input.events || []) {
    if (typeof event === "string" && event.endsWith(".csv")) {
      if (event.toLowerCase().includes("coinbase")) {
        const coinbaseEvents = formatCoinbase(event, input.logLevel);
        events = coalesce(events, coinbaseEvents, input.logLevel);
        log.info(`Found ${coinbaseEvents.length} events (${events.length} total) from coinbase: ${event}`);
      } else if (event.toLowerCase().includes("wyre")) {
        const wyreEvents = formatWyre(event, input.logLevel);
        events = coalesce(events, wyreEvents, input.logLevel);
        log.info(`Found ${wyreEvents.length} events (${events.length} total) from sendwyre: ${event}`);
      } else {
        throw new Error(`I don't know how to parse events from ${event}`);
      }
    } else if (typeof event !== "string") {
      events = coalesce(events, [{ source: "personal", ...(event as Event) }], input.logLevel);
    }
  }
  // 821
  events = events.filter(
    event => !assetListsEq(event.assetsIn, event.assetsOut) && !event.tags.includes("ignore"),
  );
  log.info(`Filtered out useless events, we're left with ${events.length}`);
  return events;
};
