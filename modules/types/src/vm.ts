import { Static, Type } from "@sinclair/typebox";

import { AddressBook } from "./addressBook";
import { Asset } from "./assets";
import { Logger } from "./logger";
import { Store } from "./store";
import { SecurityProvider } from "./security";
import { Account, DecimalString, TimestampString } from "./strings";
import { Transaction } from "./transactions";
import { enumToSchema } from "./utils";

////////////////////////////////////////
// JSON Schema

export const ChunkIndex = Type.Number();
export type ChunkIndex = Static<typeof ChunkIndex>;

export const AssetChunk = Type.Object({
  asset: Asset,
  quantity: DecimalString,
  receiveDate: TimestampString,
  disposeDate: Type.Optional(TimestampString), // undefined if we still own this chunk
  unsecured: Type.Optional(DecimalString), // should always be <= quantity but it isn't
  account: Type.Optional(Account), // undefined if we no longer own this chunk
  index: ChunkIndex, // used as a unique identifier, should never change
  inputs: Type.Array(ChunkIndex), // source chunks traded for this one
  outputs: Type.Optional(Type.Array(ChunkIndex)), // sink chunks that we gave this one away for
});
export type AssetChunk = Static<typeof AssetChunk>;

export const AssetChunks = Type.Array(AssetChunk);
export type AssetChunks = Static<typeof AssetChunks>;

export const Balances = Type.Dict(DecimalString);
export type Balances = Static<typeof Balances>;

export const EventTypes = {
  JurisdictionChange: "JurisdictionChange",
  Trade: "Trade",
  Income: "Income",
  Expense: "Expense",
  Debt: "Debt",
} as const;
export const EventType = enumToSchema(EventTypes);
export type EventType = Static<typeof EventType>;

const BaseEvent = Type.Object({
  date: TimestampString,
  newBalances: Balances,
  type: EventType,
});
type BaseEvent = Static<typeof BaseEvent>;

export const DebtEvent = Type.Intersect([
  BaseEvent,
  Type.Object({
    account: Account,
    inputs: Type.Array(ChunkIndex),
    outputs: Type.Array(ChunkIndex),
    // TODO: specify type
  }),
]);
export type DebtEvent = Static<typeof DebtEvent>;

export const TradeEvent = Type.Intersect([
  BaseEvent,
  Type.Object({
    account: Account,
    inputs: Type.Array(ChunkIndex),
    outputs: Type.Array(ChunkIndex),
  }),
]);
export type TradeEvent = Static<typeof TradeEvent>;

export const ExpenseEvent = Type.Intersect([
  BaseEvent,
  Type.Object({
    account: Account,
    outputs: Type.Array(ChunkIndex),
  }),
]);
export type ExpenseEvent = Static<typeof ExpenseEvent>;

export const IncomeEvent = Type.Intersect([
  BaseEvent,
  Type.Object({
    account: Account,
    inputs: Type.Array(ChunkIndex),
  }),
]);
export type IncomeEvent = Static<typeof IncomeEvent>;

export const JurisdictionChangeEvent = Type.Intersect([
  BaseEvent,
  Type.Object({
    fromJurisdiction: SecurityProvider,
    from: Account,
    to: Account,
    toJurisdiction: SecurityProvider,
    chunks: Type.Array(ChunkIndex),
    insecurePath: Type.Array(ChunkIndex),
  }),
]);
export type JurisdictionChangeEvent = Static<typeof JurisdictionChangeEvent>;

export const Event = Type.Union([
  DebtEvent,
  ExpenseEvent,
  IncomeEvent,
  JurisdictionChangeEvent,
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

export const HydratedJurisdictionChangeEvent = Type.Intersect([
  JurisdictionChangeEvent,
  Type.Object({
    chunks: AssetChunks,
    insecurePath: AssetChunks,
  }),
]);
export type HydratedJurisdictionChangeEvent = Static<typeof HydratedJurisdictionChangeEvent>;

export const HydratedEvent = Type.Union([
  DebtEvent,
  ExpenseEvent,
  IncomeEvent,
  JurisdictionChangeEvent,
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
  getNetWorth: () => Balances;
  json: ValueMachineJson;
  save: () => void;
}
