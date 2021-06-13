import fs from "fs";

import {
  Store,
  StoreKeys,
  StoreKey,
  StoreValues,
  emptyStore,
} from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";

import { env } from "./env";

////////////////////////////////////////
// Internal Data

const log = getLogger(env.logLevel).child({ module: "Store" });

const dirName = `/data`;

const cache: StoreValues = {
  [StoreKeys.ChainData]: null,
  [StoreKeys.Prices]: null,
  [StoreKeys.Transactions]: null,
  [StoreKeys.ValueMachine]: null,
};

////////////////////////////////////////
// Internal Functions

const getDirName = (username?: string): string => `${dirName}${username ? `/${username}`: ""}`;

const getFileName = (key: StoreKey, username?: string): string =>
  `${getDirName(username)}/${
    key.replace(/[A-Z]/g, "-$&".toLowerCase()).replace(/^-/, "").toLowerCase()
  }.json`;

const load = (username?: string) =>
  <T extends keyof StoreValues>(key: T): StoreValues[T] => {
    const filename = getFileName(key, username);
    if (!cache[key]) {
      try {
        if (!fs.existsSync(getDirName(username))){
          fs.mkdirSync(getDirName(username));
        }
        log.info(`Loading ${key} cache from ${filename}`);
        cache[key] = JSON.parse(fs.readFileSync(filename, "utf8"));
      } catch (e) {
        if (e.message.startsWith("ENOENT: no such file or directory")) {
          log.info(`Couldn't find anything, returning empty ${key}`);
          cache[key] = emptyStore[key];
        } else {
          throw new Error(
            `Invalid cache, try deleting ${filename} & try again: ${e.message}`,
          );
        }
      }
    }
    return cache[key];
  };

const save = (username?: string) =>
  <T extends keyof StoreValues>(key: T, data: StoreValues[T]): void => {
    if (!fs.existsSync(getDirName(username))){
      fs.mkdirSync(getDirName(username));
    }
    fs.writeFileSync(getFileName(key, username), JSON.stringify(data, null, 2));
    cache[key] = data;
  };

////////////////////////////////////////
// Exports

export const getStore = (username?: string): Store => ({
  load: load(username),
  save: save(username),
});
