import {
  Store,
  StoreKeys,
  StoreValues,
  emptyStore,
} from "@finances/types";
import { getLogger } from "@finances/utils";
import fs from "fs";

import { env } from "./env";

////////////////////////////////////////
// Internal Data

const log = getLogger(env.logLevel).child({ module: "Store" });

const dirName = `/data`;

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

const getDirName = (profile?: string): string => `${dirName}${profile ? `/${profile}`: ""}`;

const getFileName = (key: StoreKeys, profile?: string): string =>
  `${getDirName(profile)}/${
    key.replace(/[A-Z]/g, "-$&".toLowerCase()).replace(/^-/, "").toLowerCase()
  }.json`;

const load = (profile?: string) =>
  <T extends keyof StoreValues>(key: T): StoreValues[T] => {
    const filename = getFileName(key, profile);
    if (!cache[key]) {
      try {
        if (!fs.existsSync(getDirName(profile))){
          fs.mkdirSync(getDirName(profile));
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

const save = (profile?: string) =>
  <T extends keyof StoreValues>(key: T, data: StoreValues[T]): void => {
    if (!fs.existsSync(getDirName(profile))){
      fs.mkdirSync(getDirName(profile));
    }
    fs.writeFileSync(getFileName(key, profile), JSON.stringify(data, null, 2));
    cache[key] = data;
  };

////////////////////////////////////////
// Exports

export const getStore = (profile?: string): Store => ({
  load: load(profile),
  save: save(profile),
});
