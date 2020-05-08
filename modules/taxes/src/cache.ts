import {
  ChainData,
  Transactions,
  Events,
  PriceData as Prices,
  StateJson,
  emptyChainData,
  emptyTransactions,
  emptyEvents,
  emptyPriceData,
  emptyState,
  enumify,
} from "@finances/types";
import { ContextLogger, LevelLogger } from "@finances/utils";
import fs from "fs";

import { env } from "./env";

////////////////////////////////////////
// Internal Data

export const CachedTypes = enumify({
  ChainData: "ChainData",
  Transactions: "Transactions",
  Events: "Events",
  Prices: "Prices",
  State: "State",
});
export type CachedTypes = (typeof CachedTypes)[keyof typeof CachedTypes];

const log = new ContextLogger("Cache", new LevelLogger(env.logLevel));

type CachedData = ChainData | Transactions | Events | Prices | StateJson;

const dirName = `${process.cwd()}/../../.cache`;

const initialData = {
  [CachedTypes.ChainData]: emptyChainData,
  [CachedTypes.Transactions]: emptyTransactions,
  [CachedTypes.Events]: emptyEvents,
  [CachedTypes.Prices]: emptyPriceData,
  [CachedTypes.State]: emptyState,
};

const innerCache: { [index in CachedTypes]: CachedData | null} = {
  [CachedTypes.ChainData]: null,
  [CachedTypes.Transactions]: null,
  [CachedTypes.Events]: null,
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
export const loadPrices = (): Prices => load(CachedTypes.Prices) as Prices;
export const loadState = (): StateJson => load(CachedTypes.State) as StateJson;
export const loadTransactions = (): Transactions => load(CachedTypes.Transactions) as Transactions;
export const saveChainData = (chainData: ChainData): void => save(CachedTypes.ChainData, chainData);
export const saveEvents = (logs: Events): void => save(CachedTypes.Events, logs);
export const savePrices = (prices: Prices): void => save(CachedTypes.Prices, prices);
export const saveState = (chainData: StateJson): void => save(CachedTypes.State, chainData);
export const saveTransactions = (txs: Transactions): void => save(CachedTypes.Transactions, txs);
