import fs from "fs";

import {
  Store,
  StoreKeys,
  StoreValues,
  emptyStore,
} from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";

import { env } from "./env";

////////////////////////////////////////
// Internal Data

const log = getLogger(env.logLevel).child({ module: "Store" });

const dirName = `${process.cwd()}/../../.cache`;

const cache: StoreValues = {
  [StoreKeys.ChainData]: null,
  [StoreKeys.Transactions]: null,
  [StoreKeys.Events]: null,
  [StoreKeys.Prices]: null,
  [StoreKeys.Profile]: null,
  [StoreKeys.State]: null,
};

////////////////////////////////////////
// Internal Functions

const getDir = (): string => `${dirName}/${env.mode}`;

const toFilename = (key: StoreKeys): string => `${getDir()}/${
  key.replace(/[A-Z]/g, "-$&".toLowerCase()).replace(/^-/, "").toLowerCase()
}.json`;

const load = <T extends keyof StoreValues>(key: T): StoreValues[T] => {
  if (!cache[key]) {
    try {
      if (!fs.existsSync(getDir())){
        fs.mkdirSync(getDir());
      }
      log.info(`Loading ${key} cache from ${toFilename(key)}`);
      cache[key] = JSON.parse(fs.readFileSync(toFilename(key), "utf8"));
    } catch (e) {
      if (e.message.startsWith("ENOENT: no such file or directory")) {
        log.info(`Couldn't find anything, returning empty ${key}`);
        cache[key] = emptyStore[key];
      } else {
        throw new Error(
          `Invalid cache, try deleting ${toFilename(key)} & try again: ${e.message}`,
        );
      }
    }
  }
  return cache[key];
};

const save = <T extends keyof StoreValues>(key: T, data: StoreValues[T]): void => {
  fs.writeFileSync(toFilename(key), JSON.stringify(data, null, 2));
  cache[key] = data;
};

////////////////////////////////////////
// Run Init Code

if (!fs.existsSync(dirName)){
  fs.mkdirSync(dirName);
}

////////////////////////////////////////
// Exports

export const store = { load, save } as Store;
