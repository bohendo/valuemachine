import {
  Events,
  StateJson,
  Logs,
  ChainData,
  PriceData,
  emptyChainData,
  emptyPriceData,
} from "@finances/types";

export const emptyData = {
  priceData: emptyPriceData,
  chainData: emptyChainData,
  events: [],
  logs: [],
  state: {
    accounts: {},
    lastUpdated: (new Date(0)).toISOString(),
  } as StateJson,
};

const load = (key: string) => {
  try {
    let data = localStorage.getItem(key)
    if (data) return JSON.parse(data)
    return emptyData[key];
  } catch (e) {
    return emptyData[key];
  }
}

const save = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data))
}

export const loadPrices = () : PriceData => load("priceData");
export const savePrices = (priceData: PriceData): void => save("priceData", priceData);
export const loadChainData = (): ChainData => load("chainData") as ChainData;
export const saveChainData = (chainData: ChainData): void => save("chainData", chainData);
export const loadEvents = (): Events => load("events") as Events;
export const saveEvents = (events: Events): void => save("events", events);
export const loadLogs = (): Logs => load("logs") as Logs;
export const saveLogs = (events: Logs): void => save("logs", events);
export const loadState = (): StateJson => load("state") as StateJson;
export const saveState = (chainData: StateJson): void => save("state", chainData);
