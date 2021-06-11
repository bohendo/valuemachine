import { Assets } from "./assets";
import { SecurityProvider } from "./security";
import { Address, DecimalString, TimestampString } from "./strings";
import { Transaction } from "./transactions";
import { enumify } from "./utils";

////////////////////////////////////////
// Chunks

export type Account = Address | string;

export type Balances = {
  [asset: string]: DecimalString;
}

export type ChunkIndex = number;

// A chunk's index is used as it's unique id, it should never change
export type AssetChunk = {
  asset: Assets;
  quantity: DecimalString;
  receiveDate: TimestampString;
  disposeDate?: TimestampString; // undefined if we still own this chunk
  unsecured?: DecimalString; // quantity that's physically insecure <= quantity
  account?: Account; // undefined if we no longer own this chunk
  index: ChunkIndex; // used as a unique identifier, should never change
  inputs: ChunkIndex[]; // none if chunk is income, else it's inputs we traded for this chunk
  outputs?: ChunkIndex[]; // undefined if we still own this chunk, none if chunk was spent
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
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EventTypes = (typeof EventTypes)[keyof typeof EventTypes];

type BaseEvent = {
  date: TimestampString;
  description: string;
  newBalances: Balances;
  type: EventTypes;
};

export type IncomeEvent = BaseEvent & {
  account: Address;
  inputs: number[];
  type: typeof EventTypes.Income;
};

export type ExpenseEvent = BaseEvent & {
  account: Address;
  outputs: number[];
  type: typeof EventTypes.Expense;
};

export type DebtEvent = BaseEvent & {
  account: Address;
  inputs: number[];
  outputs: number[];
  type: typeof EventTypes.Debt;
};

export type TradeEvent = BaseEvent & {
  account: Address;
  inputs: number[];
  outputs: number[];
  type: typeof EventTypes.Trade;
};

export type JurisdictionChangeEvent = BaseEvent & {
  fromJurisdiction: SecurityProvider;
  from: Account;
  to: Account;
  toJurisdiction: SecurityProvider;
  chunks: number[];
  insecurePath: number[];
  type: typeof EventTypes.JurisdictionChange;
};

export type Event = IncomeEvent | ExpenseEvent | DebtEvent | TradeEvent | JurisdictionChangeEvent;
export type Events = Event[];
export type EventsJson = Events;

export const emptyEvents = [] as Events;

////////////////////////////////////////
// ValueMachine

export type ValueMachineJson = {
  chunks: AssetChunk[];
  date: TimestampString;
  events: Events;
}

export interface ValueMachine {
  receiveValue: (quantity: DecimalString, asset: Assets, to: Account) => AssetChunk[];
  moveValue: (quantity: DecimalString, asset: Assets, from: Account, to: Account) => void;
  tradeValue: (account: Account, inputs: Balances, outputs: Balances) => void;
  disposeValue: (quantity: DecimalString, asset: Assets, from: Account) => AssetChunk[];
  getJson: () => ValueMachineJson;
  getAccounts: () => Account[];
  getBalance: (account: Account, asset: Assets) => DecimalString;
  getNetWorth: () => Balances;
  execute: (transaction: Transaction) => Events;
}

export const emptyValueMachine = {
  chunks: [],
  date: (new Date(0)).toISOString(),
  events: [],
} as ValueMachineJson;
