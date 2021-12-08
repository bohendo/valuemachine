import { Static, Type } from "@sinclair/typebox";
import {
  Account,
  Amount,
  Asset,
  CsvParser,
  DateTimeString,
  DecString,
  Guard,
  Logger,
  Source,
  TxId,
} from "@valuemachine/types";

import { BusinessExpenseTypes, ExpenseTypes, IncomeTypes } from "./enums";

////////////////////////////////////////
// JSON Schema

export const IncomeType = Type.Enum(IncomeTypes); // NOT Extensible at run-time
export type IncomeType = Static<typeof IncomeType>;

export const BusinessExpenseType = Type.Enum(BusinessExpenseTypes); // NOT Extensible at run-time
export type BusinessExpenseType = Static<typeof BusinessExpenseType>;

export const ExpenseType = Type.Enum(ExpenseTypes); // NOT Extensible at run-time
export type ExpenseType = Static<typeof ExpenseType>;

export const TxTag = Type.Object({
  description: Type.Optional(Type.String()),
  exempt: Type.Optional(Type.Boolean()),
  expenseType: Type.Optional(Type.String()),
  incomeType: Type.Optional(Type.String()),
  multiplier: Type.Optional(DecString),
  physicalGuard: Type.Optional(Guard),
});
export type TxTag = Static<typeof TxTag>;

export const TxTags = Type.Record(TxId, TxTag);
export type TxTags = Static<typeof TxTags>;

export const TxTagTypes = {
  description: "description",
  exempt: "exempt",
  expenseType: "expenseType",
  incomeType: "incomeType",
  multiplier: "multiplier",
  physicalGuard: "physicalGuard",
} as const;
export const TxTagType = Type.Enum(TxTagTypes); // NOT Extensible at run-time
export type TxTagType = Static<typeof TxTagType>;

// Self to non-self transfers
export const OutgoingTransfers = {
  Expense: "Expense",
  Fee: "Fee",
  Repay: "Repay",
  SwapOut: "SwapOut",
} as const;

// Non-self to self transfers
export const IncomingTransfers = {
  Income: "Income",
  Refund: "Refund",
  Borrow: "Borrow",
  SwapIn: "SwapIn",
} as const;

export const TransferCategories = {
  ...OutgoingTransfers,
  ...IncomingTransfers,
  Noop: "Noop", // zero-value or external->external or other useless transfers to filter out
  Internal: "Internal", // self to self transfers
} as const;
export const TransferCategory = Type.Enum(TransferCategories); // NOT Extensible
export type TransferCategory = Static<typeof TransferCategory>;

export const Transfer = Type.Object({
  amount: Type.Optional(Amount), // undefined if atomic eg nfts
  asset: Asset,
  category: TransferCategory,
  from: Account,
  index: Type.Optional(Type.Number()), // we should require an index on all transfers
  to: Account,
});
export type Transfer = Static<typeof Transfer>;

export const Transaction = Type.Object({
  apps: Type.Array(Type.String()),
  date: DateTimeString,
  index: Type.Optional(Type.Number()), // required after merging txns together
  method: Type.String(),
  sources: Type.Array(Source),
  tag: TxTag,
  transfers: Type.Array(Transfer),
  uuid: TxId,
});
export type Transaction = Static<typeof Transaction>;

export const TransactionsJson = Type.Array(Transaction);
export type TransactionsJson = Static<typeof TransactionsJson>;

////////////////////////////////////////
// Function Interfaces

export type TransactionsParams = {
  json?: TransactionsJson;
  logger?: Logger;
  save?: (val: TransactionsJson) => void;
};

export type Transactions = {
  json: TransactionsJson;
  mergeCsv: (csvData: string, parser?: CsvParser) => void;
  merge: (transactions: TransactionsJson) => void;
};

