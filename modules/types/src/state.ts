import { AssetChunk, Assets } from "./assets";
import { Transaction } from "./transactions";
import { Address, DecimalString, TimestampString } from "./strings";

////////////////////////////////////////
// State

export type StateJson = {
  lastUpdated: TimestampString;
  accounts: { [account: string]: AssetChunk[] };
}

export type NetWorth = {
  [asset: string]: DecimalString;
}

export type StateBalances = {
  [account: string]: {
    [asset: string]: DecimalString;
  };
}

export interface State {
  getAllBalances(): StateBalances;
  getBalance(account: string, asset: Assets): DecimalString;
  getChunks(
    account: Address,
    asset: Assets,
    quantity: DecimalString,
    tx: Transaction,
    unit: Assets,
  ): AssetChunk[];
  getNetWorth(): NetWorth;
  getRelevantBalances(tx: Transaction): StateBalances;
  putChunk(account: string, chunk: AssetChunk): void;
  toJson(): StateJson;
  touch(lastUpdated: TimestampString): void;
}

export const emptyState = {
  accounts: {},
  lastUpdated: (new Date(0)).toISOString(),
} as StateJson;
