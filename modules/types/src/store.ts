import { Static, Type } from "@sinclair/typebox";

import { AddressBookJson } from "./addressBook";
import { CsvFiles } from "./csv";
import { EvmDataJson } from "./evmData";
import { PricesJson } from "./prices";
import { ValueMachineJson } from "./vm";
import { TransactionsJson } from "./transactions";

export const StoreKeys = {
  AddressBook: "AddressBook",
  CsvFiles: "CsvFiles",
  EthereumData: "EthereumData",
  PolygonData: "PolygonData",
  Prices: "Prices",
  Transactions: "Transactions",
  ValueMachine: "ValueMachine",
} as const;
export const StoreKey = Type.String(); // Extensible
export type StoreKey = Static<typeof StoreKey>;

interface StoreTypeMap {
  [StoreKeys.AddressBook]: AddressBookJson;
  [StoreKeys.CsvFiles]: CsvFiles;
  [StoreKeys.EthereumData]: EvmDataJson;
  [StoreKeys.PolygonData]: EvmDataJson;
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
