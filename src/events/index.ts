import { Event, InputData } from "../types";
import { Logger } from "../utils";
import { assetListsEq } from "../utils";

import { parseEthTxFactory } from "./parseEthTx";
import { fetchChainData } from "./fetchChainData";
import { formatCoinbase } from "./coinbase";
import { formatWyre } from "./wyre";
import { coalesce } from "./coalesce";

export const getFinancialEvents = async (input: InputData): Promise<Event[]> => {
  const log = new Logger("getFinancialEvents", input.logLevel);
  let events: Event[] = [];

  const chainData = await fetchChainData(
    input.ethAddresses.map(a => a.toLowerCase()),
    input.etherscanKey,
  );
  const chainEvents = Object.values(chainData.transactions)
    .map(parseEthTxFactory(input)).filter(e => !!e);
  events = coalesce(events, chainEvents);

  log.info(`Found ${chainEvents.length} events (${events.length} total) from ${Object.keys(chainData.transactions).length} ethereum txs`);

  for (const event of input.events || []) {
    if (typeof event === "string" && event.endsWith(".csv")) {
      if (event.toLowerCase().includes("coinbase")) {
        const coinbaseEvents = formatCoinbase(event, input.logLevel);
        events = coalesce(events, coinbaseEvents);
        log.info(`Found ${coinbaseEvents.length} events (${events.length} total) from coinbase: ${event}`);
      } else if (event.toLowerCase().includes("wyre")) {
        const wyreEvents = formatWyre(event, input.logLevel);
        events = coalesce(events, wyreEvents);
        log.info(`Found ${wyreEvents.length} events (${events.length} total) from sendwyre: ${event}`);
      } else {
        throw new Error(`I don't know how to parse events from ${event}`);
      }
    } else if (typeof event !== "string" && event.date) {
      events = coalesce(events, [event as Event]);
    } else {
      throw new Error(`I don't know how to parse event: ${JSON.stringify(event)}`);
    }
  }

  events = events.filter(event => !assetListsEq(event.assetsIn, event.assetsOut));
  log.info(`Filtered out useless events, we're left with ${events.length}`);

  return events;
};
