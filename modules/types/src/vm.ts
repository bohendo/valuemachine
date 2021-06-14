import { Asset } from "./assets";
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
  inputs: Array<ChunkIndex | AssetChunk>;
  outputs: Array<ChunkIndex | AssetChunk>;
  type: typeof EventTypes.Debt;
};

export type ExpenseEvent = BaseEvent & {
  account: Account;
  outputs: Array<ChunkIndex | AssetChunk>;
  type: typeof EventTypes.Expense;
};

export type IncomeEvent = BaseEvent & {
  account: Account;
  inputs: Array<ChunkIndex | AssetChunk>;
  type: typeof EventTypes.Income;
};

export type JurisdictionChangeEvent = BaseEvent & {
  fromJurisdiction: SecurityProvider;
  from: Account;
  to: Account;
  toJurisdiction: SecurityProvider;
  chunks: Array<ChunkIndex | AssetChunk>;
  insecurePath: Array<ChunkIndex | AssetChunk>;
  type: typeof EventTypes.JurisdictionChange;
};

export type TradeEvent = BaseEvent & {
  account: Account;
  inputs: Array<ChunkIndex | AssetChunk>;
  outputs: Array<ChunkIndex | AssetChunk>;
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

export interface ValueMachine {
  receiveValue: (quantity: DecimalString, asset: Asset, to: Account) => AssetChunk[];
  moveValue: (quantity: DecimalString, asset: Asset, from: Account, to: Account) => void;
  tradeValue: (account: Account, inputs: Balances, outputs: Balances) => void;
  disposeValue: (quantity: DecimalString, asset: Asset, from: Account) => AssetChunk[];
  getJson: () => ValueMachineJson;
  getChunk: (index: ChunkIndex) => AssetChunk;
  getEvent: (index: number) => Event;
  getAccounts: () => Account[];
  getBalance: (account: Account, asset: Asset) => DecimalString;
  getNetWorth: () => Balances;
  execute: (transaction: Transaction) => Events;
}

export const emptyValueMachine = {
  chunks: [],
  date: (new Date(0)).toISOString(),
  events: [],
} as ValueMachineJson;
