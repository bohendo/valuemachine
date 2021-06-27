import { AddressBookJson } from "./addressBook";
import { ChainDataJson } from "./chainData";
import { PricesJson } from "./prices";
import { ValueMachineJson } from "./vm";
import { TransactionsJson } from "./transactions";
import { enumify } from "./utils";

export const StoreKeys = enumify({
  AddressBook: "AddressBook",
  ChainData: "ChainData",
  Prices: "Prices",
  Transactions: "Transactions",
  ValueMachine: "ValueMachine",
});
export type StoreKey = (typeof StoreKeys)[keyof typeof StoreKeys];

interface StoreTypeMap {
  [StoreKeys.AddressBook]: AddressBookJson;
  [StoreKeys.ChainData]: ChainDataJson;
  [StoreKeys.Prices]: PricesJson;
  [StoreKeys.Transactions]: TransactionsJson;
  [StoreKeys.ValueMachine]: ValueMachineJson;
}

export type StoreValues = {
  [P in keyof StoreTypeMap]: StoreTypeMap[P];
}

export interface Store {
  load: <T extends keyof StoreValues>(key: T) => StoreValues[T];
  save: <T extends keyof StoreValues>(key: T, value: StoreValues[T]) => void; 
}
