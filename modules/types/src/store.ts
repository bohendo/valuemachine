import { enumify } from "./utils";
import { ChainDataJson, emptyChainData } from "./chainData";
import { PricesJson, emptyPrices } from "./prices";
import { ProfileJson, emptyProfile } from "./profile";
import { ValueMachineJson, emptyValueMachine } from "./vm";
import { TransactionsJson, emptyTransactions } from "./transactions";

export const StoreKeys = enumify({
  ChainData: "ChainData",
  Prices: "Prices",
  Profile: "Profile",
  ValueMachine: "ValueMachine",
  Transactions: "Transactions",
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type StoreKeys = (typeof StoreKeys)[keyof typeof StoreKeys];

interface StoreTypeMap {
  [StoreKeys.ChainData]: ChainDataJson;
  [StoreKeys.Prices]: PricesJson;
  [StoreKeys.Profile]: ProfileJson;
  [StoreKeys.ValueMachine]: ValueMachineJson;
  [StoreKeys.Transactions]: TransactionsJson;
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
  [StoreKeys.Profile]: emptyProfile,
  [StoreKeys.ValueMachine]: emptyValueMachine,
  [StoreKeys.Transactions]: emptyTransactions,
};
