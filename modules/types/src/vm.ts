import { Static, Type } from "@sinclair/typebox";

import { Logger } from "./logger";
import { Store } from "./store";
import { Account, Asset, DecString, DateTimeString } from "./strings";
import { Transaction } from "./transactions";

////////////////////////////////////////
// JSON Schema

export const ChunkIndex = Type.Number();
export type ChunkIndex = Static<typeof ChunkIndex>;

export const AssetChunk = Type.Object({
  asset: Asset,
  amount: DecString,
  history: Type.Array(Type.Object({ // length should always be >= 1
    date: DateTimeString, // receiveDate = history[0].date
    account: Account,
  })),
  disposeDate: Type.Optional(DateTimeString), // undefined if we still own this chunk
  account: Type.Optional(Account), // undefined if we no longer own this chunk
  index: ChunkIndex, // used as a unique identifier, should never change
  inputs: Type.Array(ChunkIndex), // chunks given away in exchange for this one
  outputs: Type.Optional(Type.Array(ChunkIndex)), // chunks that we got in exchange for this one
});
export type AssetChunk = Static<typeof AssetChunk>;

export const AssetChunks = Type.Array(AssetChunk);
export type AssetChunks = Static<typeof AssetChunks>;

export const Balances = Type.Record(Type.String(), DecString);
export type Balances = Static<typeof Balances>;

export const EventTypes = {
  Debt: "Debt",
  Error: "Error",
  Expense: "Expense",
  GuardChange: "GuardChange",
  Income: "Income",
  Trade: "Trade",
} as const;
export const EventType = Type.Enum(EventTypes);
export type EventType = Static<typeof EventType>;

export const EventErrorCodes = {
  MISSING_SWAP: "MISSING_SWAP",
  MULTI_ACCOUNT_SWAP: "MULTI_ACCOUNT_SWAP",
  UNDERFLOW: "UNDERFLOW",
} as const;
export const EventErrorCode = Type.Enum(EventErrorCodes);
export type EventErrorCode = Static<typeof EventErrorCode>;

const BaseEvent = Type.Object({
  date: DateTimeString,
  index: Type.Number(),
  txId: Type.String(),
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

export const ErrorEvent = Type.Intersect([
  BaseEvent,
  Type.Object({
    message: Type.String(),
    accounts: Type.Array(Account),
    code: Type.String(),
    type: Type.Literal(EventTypes.Error),
  }),
]);
export type ErrorEvent = Static<typeof ErrorEvent>;

export const ExpenseEvent = Type.Intersect([
  BaseEvent,
  Type.Object({
    account: Account,
    to: Account,
    outputs: Type.Array(ChunkIndex),
    type: Type.Literal(EventTypes.Expense),
  }),
]);
export type ExpenseEvent = Static<typeof ExpenseEvent>;

export const GuardChangeEvent = Type.Intersect([
  BaseEvent,
  Type.Object({
    from: Account,
    to: Account,
    chunks: Type.Array(ChunkIndex),
    insecurePath: Type.Array(ChunkIndex),
    type: Type.Literal(EventTypes.GuardChange),
  }),
]);
export type GuardChangeEvent = Static<typeof GuardChangeEvent>;

export const IncomeEvent = Type.Intersect([
  BaseEvent,
  Type.Object({
    account: Account,
    from: Account,
    inputs: Type.Array(ChunkIndex),
    type: Type.Literal(EventTypes.Income),
  }),
]);
export type IncomeEvent = Static<typeof IncomeEvent>;

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

export const Event = Type.Union([
  DebtEvent,
  ErrorEvent,
  ExpenseEvent,
  GuardChangeEvent,
  IncomeEvent,
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

export const HydratedErrorEvent = Type.Intersect([
  ErrorEvent,
  Type.Object({
    chunks: AssetChunks,
    insecurePath: AssetChunks,
  }),
]);
export type HydratedErrorEvent = Static<typeof HydratedErrorEvent>;

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

export const HydratedIncomeEvent = Type.Intersect([
  IncomeEvent,
  Type.Object({
    inputs: AssetChunks,
  }),
]);
export type HydratedIncomeEvent = Static<typeof HydratedIncomeEvent>;

export const HydratedTradeEvent = Type.Intersect([
  TradeEvent,
  Type.Object({
    inputs: AssetChunks,
    outputs: AssetChunks,
  }),
]);
export type HydratedTradeEvent = Static<typeof HydratedTradeEvent>;

export const HydratedEvent = Type.Union([
  HydratedDebtEvent,
  HydratedErrorEvent,
  HydratedExpenseEvent,
  HydratedGuardChangeEvent,
  HydratedIncomeEvent,
  HydratedTradeEvent,
]);
export type HydratedEvent = Static<typeof HydratedEvent>;

////////////////////////////////////////
// ValueMachine Schema

export const ValueMachineJson = Type.Object({
  chunks: AssetChunks,
  date: DateTimeString,
  events: Events,
});
export type ValueMachineJson = Static<typeof ValueMachineJson>;

////////////////////////////////////////
// Function Interfaces

export type ValueMachineParams = {
  json?: ValueMachineJson;
  logger?: Logger;
  store?: Store;
};

export interface ValueMachine {
  execute: (transaction: Transaction) => Events;
  getAccounts: () => Account[];
  getBalance: (account: Account, asset: Asset) => DecString;
  getChunk: (index: ChunkIndex) => HydratedAssetChunk;
  getEvent: (index: number) => HydratedEvent;
  getNetWorth: (account?: string) => Balances;
  json: ValueMachineJson;
  save: () => void;
}
