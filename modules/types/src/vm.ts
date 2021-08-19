import { Static, Type } from "@sinclair/typebox";

import { AddressBook } from "./addressBook";
import { Asset } from "./assets";
import { Logger } from "./logger";
import { Store } from "./store";
import { Guard } from "./guards";
import { Account, DecimalString, TimestampString } from "./strings";
import { Transaction } from "./transactions";

////////////////////////////////////////
// JSON Schema

export const ChunkIndex = Type.Number();
export type ChunkIndex = Static<typeof ChunkIndex>;

export const AssetChunk = Type.Object({
  asset: Asset,
  quantity: DecimalString,
  // receiveDate = history[0].date
  history: Type.Array(Type.Object({
    date: TimestampString,
    guard: Guard,
  })),
  disposeDate: Type.Optional(TimestampString), // undefined if we still own this chunk
  account: Type.Optional(Account), // undefined if we no longer own this chunk
  index: ChunkIndex, // used as a unique identifier, should never change
  inputs: Type.Array(ChunkIndex), // source chunks traded for this one
  outputs: Type.Optional(Type.Array(ChunkIndex)), // sink chunks that we gave this one away for
});
export type AssetChunk = Static<typeof AssetChunk>;

export const AssetChunks = Type.Array(AssetChunk);
export type AssetChunks = Static<typeof AssetChunks>;

export const Balances = Type.Record(Type.String(), DecimalString);
export type Balances = Static<typeof Balances>;

export const EventTypes = {
  GuardChange: "GuardChange",
  Trade: "Trade",
  Income: "Income",
  Expense: "Expense",
  Debt: "Debt",
} as const;
export const EventType = Type.Enum(EventTypes);
export type EventType = Static<typeof EventType>;

const BaseEvent = Type.Object({
  date: TimestampString,
  newBalances: Balances,
  index: Type.Number(),
});
type BaseEvent = Static<typeof BaseEvent>;

export const DebtEvent = Type.Intersect([
  BaseEvent,
  Type.Object({
    account: Account,
    inputs: Type.Array(ChunkIndex),
    outputs: Type.Array(ChunkIndex),
    type: Type.Literal(EventTypes.Debt),
  }),
]);
export type DebtEvent = Static<typeof DebtEvent>;

export const TradeEvent = Type.Intersect([
  BaseEvent,
  Type.Object({
    account: Account,
    inputs: Type.Array(ChunkIndex),
    outputs: Type.Array(ChunkIndex),
    type: Type.Literal(EventTypes.Trade),
  }),
]);
export type TradeEvent = Static<typeof TradeEvent>;

export const ExpenseEvent = Type.Intersect([
  BaseEvent,
  Type.Object({
    account: Account,
    outputs: Type.Array(ChunkIndex),
    type: Type.Literal(EventTypes.Expense),
  }),
]);
export type ExpenseEvent = Static<typeof ExpenseEvent>;

export const IncomeEvent = Type.Intersect([
  BaseEvent,
  Type.Object({
    account: Account,
    inputs: Type.Array(ChunkIndex),
    type: Type.Literal(EventTypes.Income),
  }),
]);
export type IncomeEvent = Static<typeof IncomeEvent>;

export const GuardChangeEvent = Type.Intersect([
  BaseEvent,
  Type.Object({
    fromGuard: Guard,
    from: Account,
    to: Account,
    toGuard: Guard,
    chunks: Type.Array(ChunkIndex),
    insecurePath: Type.Array(ChunkIndex),
    type: Type.Literal(EventTypes.GuardChange),
  }),
]);
export type GuardChangeEvent = Static<typeof GuardChangeEvent>;

export const Event = Type.Union([
  DebtEvent,
  ExpenseEvent,
  IncomeEvent,
  GuardChangeEvent,
  TradeEvent,
]);
export type Event = Static<typeof Event>;

export const Events = Type.Array(Event);
export type Events = Static<typeof Events>;

////////////////////////////////////////
// Hydrated Data aka types w indexes replaced w referenced values

export const HydratedAssetChunk = Type.Intersect([
  AssetChunk,
  Type.Object({
    inputs: AssetChunks,
    outputs: Type.Optional(AssetChunks),
  }),
]);
export type HydratedAssetChunk = Static<typeof HydratedAssetChunk>;

export const HydratedDebtEvent = Type.Intersect([
  DebtEvent,
  Type.Object({
    inputs: Type.Optional(AssetChunks),
    outputs: Type.Optional(AssetChunks),
  }),
]);
export type HydratedDebtEvent = Static<typeof HydratedDebtEvent>;

export const HydratedTradeEvent = Type.Intersect([
  TradeEvent,
  Type.Object({
    inputs: AssetChunks,
    outputs: AssetChunks,
  }),
]);
export type HydratedTradeEvent = Static<typeof HydratedTradeEvent>;

export const HydratedIncomeEvent = Type.Intersect([
  IncomeEvent,
  Type.Object({
    inputs: AssetChunks,
  }),
]);
export type HydratedIncomeEvent = Static<typeof HydratedIncomeEvent>;

export const HydratedExpenseEvent = Type.Intersect([
  ExpenseEvent,
  Type.Object({
    outputs: AssetChunks,
  }),
]);
export type HydratedExpenseEvent = Static<typeof HydratedExpenseEvent>;

export const HydratedGuardChangeEvent = Type.Intersect([
  GuardChangeEvent,
  Type.Object({
    chunks: AssetChunks,
    insecurePath: AssetChunks,
  }),
]);
export type HydratedGuardChangeEvent = Static<typeof HydratedGuardChangeEvent>;

export const HydratedEvent = Type.Union([
  DebtEvent,
  ExpenseEvent,
  IncomeEvent,
  GuardChangeEvent,
  TradeEvent,
]);
export type HydratedEvent = Static<typeof HydratedEvent>;

////////////////////////////////////////
// ValueMachine Schema

export const ValueMachineJson = Type.Object({
  chunks: AssetChunks,
  date: TimestampString,
  events: Events,
});
export type ValueMachineJson = Static<typeof ValueMachineJson>;

////////////////////////////////////////
// Function Interfaces

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
  getChunk: (index: ChunkIndex) => HydratedAssetChunk;
  getEvent: (index: number) => HydratedEvent;
  getNetWorth: (account?: string) => Balances;
  json: ValueMachineJson;
  save: () => void;
}
