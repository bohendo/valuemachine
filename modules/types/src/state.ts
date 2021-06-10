import { Assets } from "./assets";
import { Address, DecimalString, TimestampString } from "./strings";

////////////////////////////////////////
// State

export type Account = Address | string;

// A chunk's index is used as it's unique id, it should never change
export type AssetChunk = {
  asset: Assets;
  quantity: DecimalString;
  receiveDate: TimestampString;
  disposeDate?: TimestampString; // undefined if we still own this chunk
  unsecured?: DecimalString; // quantity that's physically insecure <= quantity
  account?: Account; // undefined if we no longer own this chunk
  index: number; // used to specify inputs/outputs
  inputs: number[]; // none if chunk is income, else it's inputs we traded for this chunk
  outputs?: number[]; // undefined if we still own this chunk, none if chunk was spent
};

export type StateJson = {
  chunks: AssetChunk[];
  date: TimestampString;
}

export type Balances = {
  [asset: string]: DecimalString;
}

export interface StateFns {
  receiveValue: (quantity: DecimalString, asset: Assets, to: Account) => AssetChunk[];
  moveValue: (quantity: DecimalString, asset: Assets, from: Account, to: Account) => void;
  tradeValue: (account: Account, inputs: Balances, outputs: Balances) => void;
  disposeValue: (quantity: DecimalString, asset: Assets, from: Account) => AssetChunk[];
  getJson: () => StateJson;
  getAccounts: () => Account[];
  getBalance: (account: Account, asset: Assets) => DecimalString;
  getNetWorth: () => Balances;
}

export const emptyState = {
  chunks: [],
  date: (new Date(0)).toISOString()
} as StateJson;
