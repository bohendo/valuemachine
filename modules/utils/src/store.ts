import { Store, StoreKey, StoreKeys } from "@valuemachine/types";

import { getEmptyAddressBook, getAddressBookError } from "./addressBook";
import { getEmptyChainData, getChainDataError } from "./chainData";
import { getEmptyPrices, getPricesError } from "./prices";
import { getEmptyTransactions, getTransactionsError } from "./transactions";
import { getEmptyValueMachine, getValueMachineError } from "./vm";

const validators =  {
  [StoreKeys.AddressBook]: getAddressBookError,
  [StoreKeys.ChainData]: getChainDataError,
  [StoreKeys.Prices]: getPricesError,
  [StoreKeys.Transactions]: getTransactionsError,
  [StoreKeys.ValueMachine]: getValueMachineError,
};

const emptyStore = {
  [StoreKeys.AddressBook]: getEmptyAddressBook(),
  [StoreKeys.ChainData]: getEmptyChainData(),
  [StoreKeys.Prices]: getEmptyPrices(),
  [StoreKeys.Transactions]: getEmptyTransactions(),
  [StoreKeys.ValueMachine]: getEmptyValueMachine(),
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
