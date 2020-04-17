import { ChainData, Events, Logs, PriceData, StateJson } from "./index";

export const emptyChainData = {
  addresses: {},
  calls: [],
  tokens: {},
  transactions: [],
} as ChainData;

export const emptyEvents = [] as Events;

export const emptyLogs = [] as Logs;

export const emptyPriceData = { ids: {} } as PriceData;

export const emptyState = {
  accounts: {},
  lastUpdated: (new Date(0)).toISOString(),
} as StateJson;
