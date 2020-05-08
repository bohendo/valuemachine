import {
  Transactions,
  StateJson,
  Events,
  ChainDataJson,
  PriceData,
  emptyPriceData,
} from "@finances/types";

import chainData from "../data/chain-data.json";
import { Personal } from "../types";

export const emptyData = {
  chainData: chainData,
  transactions: [],
  events: [],
  personal: {
    profileName: '',
    addressBook: [],
  } as Personal,
  priceData: emptyPriceData,
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
export const loadChainData = (): ChainDataJson => load("chainData") as ChainDataJson;
export const loadTransactions = (): Transactions => load("transactions") as Transactions;
export const loadEvents = (): Events => load("events") as Events;
export const loadState = (): StateJson => load("state") as StateJson;
export const loadPersonal = (): Personal => load("personal") as Personal;

export const saveEvents = (events: Events): void => save("events", events);
export const savePrices = (priceData: PriceData): void => save("priceData", priceData);
export const saveChainData = (chainData: ChainDataJson): void => save("chainData", chainData);
export const saveTransactions = (transactions: Transactions): void => save("transactions", transactions);
export const saveState = (chainData: StateJson): void => save("state", chainData);
export const savePersonal = (personal: Personal) => save("personal", personal);
