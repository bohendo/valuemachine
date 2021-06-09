import { AssetChunk, Assets } from "./assets";
import { Events } from "./events";
import { Address, DecimalString, TimestampString } from "./strings";

////////////////////////////////////////
// State

export type Account = Address | string;

export type StateJson = {
  lastUpdated: TimestampString;
  totalChunks: number;
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
  createAccount(account: Account): void;
  getBalance(account: Account, asset: Assets): DecimalString;
  getChunks(
    account: Account,
    asset: Assets,
    quantity: DecimalString,
    date: TimestampString,
    events?: Events,
  ): AssetChunk[];
  getInsecurePath(chunk: AssetChunk): AssetChunk[];
  getNetWorth(): NetWorth;
  disposeChunk(chunk: AssetChunk): void;
  mintChunk(
    asset: Assets,
    quantity: DecimalString,
    receiveDate: TimestampString,
    sources?: number[],
  ): AssetChunk;
  putChunk(
    chunk: AssetChunk,
    account: Account,
  ): void;
  toJson(): StateJson;
  touch(lastUpdated: TimestampString): void;
}

export const emptyState = {
  accounts: {},
  lastUpdated: (new Date(0)).toISOString(),
  totalChunks: 0,
} as StateJson;
