import { AssetChunk, AssetTypes } from "./assets";
import { Transaction } from "./transactions";
import { Address, DecimalString, TimestampString } from "./strings";

////////////////////////////////////////
// State

export type StateJson = {
  lastUpdated: TimestampString;
  accounts: { [account: string]: AssetChunk[] };
}

export type NetWorth = {
  [assetType: string]: DecimalString;
}

export type StateBalances = {
  [account: string]: {
    [assetType: string]: DecimalString;
  };
}

export interface State {
  getAllBalances(): StateBalances;
  getBalance(account: string, assetType: AssetTypes): DecimalString;
  getChunks(
    account: Address,
    assetType: AssetTypes,
    quantity: DecimalString,
    tx: Transaction,
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
