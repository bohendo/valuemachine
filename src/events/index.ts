/* global process */
import {
  Asset,
  AssetType,
  ChainData,
  Event,
  FinancialData,
  Forms,
  InputData,
  TaxableTrade,
} from "../types";
import { add, eq, gt, lt, mul, round, sub, Logger } from "../utils";

import { parseEthTxFactory } from "./parseEthTx";
import { fetchChainData } from "./fetchChainData";
import { getTaxableTrades } from "./getTaxableTrades";
import { formatCoinbase } from "./coinbase";
import { formatWyre } from "./wyre";

export const getFinancialData = async (input: InputData): Promise<FinancialData> => {

  const log = new Logger("getFinancialData", input.logLevel);
  const events: Event[] = [];

  for (const event of input.events || []) {
    if (typeof event === "string" && event.endsWith(".csv")) {
      if (event.toLowerCase().includes("coinbase")) {
        log.info(`Coinbase detected! ${event}`);
        events.push(...formatCoinbase(event, input.logLevel));
      } else if (event.toLowerCase().includes("wyre")) {
        events.push(...formatWyre(event, input.logLevel));
      } else {
        throw new Error(`I don't know how to parse events from ${event}`);
      }
    } else if (typeof event !== "string" && event.date) {
      events.push(event as Event);
    } else {
      throw new Error(`I don't know how to parse event: ${JSON.stringify(event)}`);
    }
  }

  log.info("Temporarily done");
  process.exit(0);

  const chainData = await fetchChainData(input.ethAddresses.map(a => a.toLowerCase()), input.etherscanKey);
  const parseEthTx = parseEthTxFactory(input);

  events.concat(
    ...Object.values(chainData.transactions).map(parseEthTx).filter(e => !!e),
  );

  return {
    expenses: [],
    income: [],
    trades: [], // getTaxableTrades(input, events),
  };
};
