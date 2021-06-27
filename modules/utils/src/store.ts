import { emptyStore, Store, StoreKey, StoreKeys } from "@valuemachine/types";

import { getAddressBookError } from "./addressBook";
import { getChainDataError } from "./eth";
import { getPricesError } from "./prices";
import { getTransactionsError } from "./transactions";
import { getValueMachineError } from "./vm";

const validators =  {
  [StoreKeys.AddressBook]: getAddressBookError,
  [StoreKeys.ChainData]: getChainDataError,
  [StoreKeys.Prices]: getPricesError,
  [StoreKeys.Transactions]: getTransactionsError,
  [StoreKeys.ValueMachine]: getValueMachineError,
};

export const getLocalStore = (localStorage: any): Store => ({
  load: (key: StoreKey): any => {
    try {
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);
      return emptyStore[key];
    } catch (e) {
      return emptyStore[key];
    }
  },
  save: (key: StoreKey, data: any): void => {
    const error = validators[key]?.(data);
    if (error) throw new Error(error);
    localStorage.setItem(key, JSON.stringify(data || emptyStore[key]));
  },
});

export const getFileStore = (dirpath: string, fs: any): Store => {
  const getFilePath = (key: StoreKey): string => `${
    dirpath.endsWith("/") ? dirpath.replace(/\/$/, "") : dirpath
  }/${
    key.replace(/[A-Z]/g, "-$&").replace(/^-/, "").toLowerCase()
  }.json`;
  return {
    load: (key: StoreKey): any => {
      try {
        return JSON.parse(fs.readFileSync(getFilePath(key), "utf8"));
      } catch (e) {
        return emptyStore[key];
      }
    },
    save: (key: StoreKey, data: any): void => {
      const error = validators[key]?.(data);
      if (error) throw new Error(error);
      fs.writeFileSync(getFilePath(key), JSON.stringify(data, null, 2));
    },
  };
};
