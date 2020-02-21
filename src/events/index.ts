/* global process */
import fs from "fs";
import {
  Asset,
  AssetType,
  ChainData,
  Event,
  Forms,
  InputData,
  TaxableTrade,
} from "../types";
import { add, eq, gt, lt, mul, round, sub, Logger } from "../utils";

import { parseEthTxFactory } from "./parseEthTx";
import { fetchChainData } from "./fetchChainData";
import { formatCoinbase } from "./coinbase";
import { formatWyre } from "./wyre";
import { coalesce } from "./coalesce";

export const getFinancialEvents = async (input: InputData): Promise<Event[]> => {
  const log = new Logger("getFinancialEvents", input.logLevel);
  let events: Event[] = [];

  for (const event of input.events || []) {
    if (typeof event === "string" && event.endsWith(".csv")) {
      if (event.toLowerCase().includes("coinbase")) {
        log.info(`Found Coinbase events: ${event}`);
        events = coalesce(events, formatCoinbase(event, input.logLevel));
      } else if (event.toLowerCase().includes("wyre")) {
        log.info(`Found Sendwyre events: ${event}`);
        events = coalesce(events, formatWyre(event, input.logLevel));
      } else {
        throw new Error(`I don't know how to parse events from ${event}`);
      }
    } else if (typeof event !== "string" && event.date) {
      events = coalesce(events, [event as Event]);
    } else {
      throw new Error(`I don't know how to parse event: ${JSON.stringify(event)}`);
    }
  }

  const chainEvents = Object.values((await fetchChainData(
    input.ethAddresses.map(a => a.toLowerCase()),
    input.etherscanKey,
  )).transactions).map(parseEthTxFactory(input)).filter(e => !!e);

  events = coalesce(events, chainEvents);

  return events;
};
