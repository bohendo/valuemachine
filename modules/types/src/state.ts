import { AssetChunk, Assets } from "./assets";
import { Events } from "./events";
import { Transaction, Transfer } from "./transactions";
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
    transfer?: Transfer,
    events?: Events,
  ): AssetChunk[];
  getInsecure(date: TimestampString, asset: Assets, quantity: DecimalString): AssetChunk[];
  getNetWorth(): NetWorth;
  getRelevantBalances(tx: Transaction): StateBalances;
  putChunk(account: Account, chunk: AssetChunk): void;
  receiveChunk(
    asset: Assets,
    quantity: DecimalString,
    receiveDate: TimestampString,
    sources?: number[],
  ): AssetChunk;
  disposeChunk(
    chunk: AssetChunk,
    date: TimestampString,
    from: Account,
    to: Account,
  ): void;
  toJson(): StateJson;
  touch(lastUpdated: TimestampString): void;
}

export const emptyState = {
  accounts: {},
  lastUpdated: (new Date(0)).toISOString(),
  totalChunks: 0,
} as StateJson;
