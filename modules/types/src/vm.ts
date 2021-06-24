import { AddressBook } from "./addressBook";
import { Asset } from "./assets";
import { Logger } from "./logger";
import { Store } from "./store";
import { SecurityProvider } from "./security";
import { Account, DecimalString, TimestampString } from "./strings";
import { Transaction } from "./transactions";
import { enumify } from "./utils";

////////////////////////////////////////
// Chunks

export type Balances = {
  [asset: string]: DecimalString;
}

export type ChunkIndex = number;

export type AssetChunk = {
  asset: Asset;
  quantity: DecimalString;
  receiveDate: TimestampString;
  disposeDate?: TimestampString; // undefined if we still own this chunk
  unsecured?: DecimalString; // quantity that's still physically insecure (always <= quantity)
  account?: Account; // undefined if we no longer own this chunk
  index: ChunkIndex; // used as a unique identifier, should never change
  inputs: ChunkIndex[]; // empty if chunk is income, else it's inputs we traded for this chunk
  outputs?: ChunkIndex[]; // undefined if we still own this chunk, empty if chunk was spent
};

////////////////////////////////////////
// Events

export const EventTypes = enumify({
  JurisdictionChange: "JurisdictionChange",
  Trade: "Trade",
  Income: "Income",
  Expense: "Expense",
  Debt: "Debt",
});
export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

type BaseEvent = {
  date: TimestampString;
  newBalances: Balances;
  type: EventType;
};

export type DebtEvent = BaseEvent & {
  account: Account;
  inputs: Array<ChunkIndex>;
  outputs: Array<ChunkIndex>;
  type: typeof EventTypes.Debt;
};

export type ExpenseEvent = BaseEvent & {
  account: Account;
  outputs: Array<ChunkIndex>;
  type: typeof EventTypes.Expense;
};

export type IncomeEvent = BaseEvent & {
  account: Account;
  inputs: Array<ChunkIndex>;
  type: typeof EventTypes.Income;
};

export type JurisdictionChangeEvent = BaseEvent & {
  fromJurisdiction: SecurityProvider;
  from: Account;
  to: Account;
  toJurisdiction: SecurityProvider;
  chunks: Array<ChunkIndex>;
  insecurePath: Array<ChunkIndex>;
  type: typeof EventTypes.JurisdictionChange;
};

export type TradeEvent = BaseEvent & {
  account: Account;
  inputs: Array<ChunkIndex>;
  outputs: Array<ChunkIndex>;
  type: typeof EventTypes.Trade;
};

export type Event =
  | DebtEvent
  | ExpenseEvent
  | IncomeEvent
  | JurisdictionChangeEvent
  | TradeEvent;
export type Events = Event[];

export const emptyEvents = [] as Events;

////////////////////////////////////////
// ValueMachine

export type ValueMachineJson = {
  chunks: AssetChunk[];
  date: TimestampString;
  events: Events;
}

export type ValueMachineParams = {
  addressBook: AddressBook;
  json?: ValueMachineJson;
  logger?: Logger;
  store?: Store;
};

export interface ValueMachine {
  execute: (transaction: Transaction) => Events;
  getAccounts: () => Account[];
  getBalance: (account: Account, asset: Asset) => DecimalString;
  getChunk: (index: ChunkIndex) => AssetChunk;
  getEvent: (index: number) => Event;
  getNetWorth: () => Balances;
  json: ValueMachineJson;
  save: () => void;
}

export const emptyValueMachine = {
  chunks: [],
  date: (new Date(0)).toISOString(),
  events: [],
} as ValueMachineJson;
