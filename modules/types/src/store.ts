import { enumify } from "./utils";
import { ChainDataJson, emptyChainData } from "./chainData";
import { PricesJson, emptyPrices } from "./prices";
import { ValueMachineJson, emptyValueMachine } from "./vm";
import { TransactionsJson, emptyTransactions } from "./transactions";

export const StoreKeys = enumify({
  ChainData: "ChainData",
  Prices: "Prices",
  Transactions: "Transactions",
  ValueMachine: "ValueMachine",
});
export type StoreKey = (typeof StoreKeys)[keyof typeof StoreKeys];

interface StoreTypeMap {
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

export const emptyStore: StoreValues = {
  [StoreKeys.ChainData]: emptyChainData,
  [StoreKeys.Prices]: emptyPrices,
  [StoreKeys.Transactions]: emptyTransactions,
  [StoreKeys.ValueMachine]: emptyValueMachine,
};
