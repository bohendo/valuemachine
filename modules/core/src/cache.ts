/* global process */
import { ChainData, PriceData as Prices } from "@finances/types";
import fs from "fs";

import { CachedTypes } from "./enums";
import { env } from "./env";
import { Logger } from "./utils";
import { Events, Logs, StateJson } from "./types";

////////////////////////////////////////
// Internal Data

const log = new Logger("Cache", env.logLevel);

type CachedData = ChainData | Events | Logs | Prices | StateJson;

const dirName = `${process.cwd()}/.cache`;

const initialData = {
  [CachedTypes.ChainData]: {
    addresses: {},
    calls: [],
    tokens: {},
    transactions: [],
  } as ChainData,
  [CachedTypes.Events]: [] as Events,
  [CachedTypes.Logs]: [] as Logs,
  [CachedTypes.Prices]: { ids: {} } as Prices,
  [CachedTypes.State]: {
    accounts: {},
    lastUpdated: (new Date(0)).toISOString(),
  } as StateJson,
};

const innerCache: { [index in CachedTypes]: CachedData | null} = {
  [CachedTypes.ChainData]: null,
  [CachedTypes.Events]: null,
  [CachedTypes.Logs]: null,
  [CachedTypes.Prices]: null,
  [CachedTypes.State]: null,
};

////////////////////////////////////////
// Internal Functions

const getDir = (): string => `${dirName}/${env.mode}`;

const toFilename = (cachedType: CachedTypes): string => `${getDir()}/${
    cachedType.replace(/[A-Z]/g, "-$&".toLowerCase()).replace(/^-/, "").toLowerCase()
  }.json`;

const load = (cachedType: CachedTypes): CachedData => {
  if (!innerCache[cachedType]) {
    try {
      if (!fs.existsSync(getDir())){
        fs.mkdirSync(getDir());
      }
      log.info(`Loading ${cachedType} cache from ${toFilename(cachedType)}`);
      innerCache[cachedType] = JSON.parse(fs.readFileSync(toFilename(cachedType), "utf8"));
    } catch (e) {
      if (e.message.startsWith("ENOENT: no such file or directory")) {
        innerCache[cachedType] = initialData[cachedType];
      } else {
        throw new Error(
          `Invalid cache, try deleting ${toFilename(cachedType)} & try again: ${e.message}`,
        );
      }
    }
  }
  return innerCache[cachedType];
};

const save = (cachedType: CachedTypes, data: CachedData): void => {
  fs.writeFileSync(toFilename(cachedType), JSON.stringify(data, null, 2));
  innerCache[cachedType] = data;
};

////////////////////////////////////////
// Run Init Code

if (!fs.existsSync(dirName)){
  fs.mkdirSync(dirName);
}

////////////////////////////////////////
// Exports

export const loadChainData = (): ChainData => load(CachedTypes.ChainData) as ChainData;
export const loadEvents = (): Events => load(CachedTypes.Events) as Events;
export const loadLogs = (): Logs => load(CachedTypes.Logs) as Logs;
export const loadPrices = (): Prices => load(CachedTypes.Prices) as Prices;
export const loadState = (): StateJson => load(CachedTypes.State) as StateJson;
export const saveChainData = (chainData: ChainData): void => save(CachedTypes.ChainData, chainData);
export const saveEvents = (events: Events): void => save(CachedTypes.Events, events);
export const saveLogs = (events: Logs): void => save(CachedTypes.Logs, events);
export const savePrices = (prices: Prices): void => save(CachedTypes.Prices, prices);
export const saveState = (chainData: StateJson): void => save(CachedTypes.State, chainData);
