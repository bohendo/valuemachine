import { Static, Type } from "@sinclair/typebox";

import { CsvParser } from "./csv";
import { Logger } from "./logger";
import {
  Account,
  Amount,
  Asset,
  DateTimeString,
  Source,
  TxId,
} from "./strings";
import { Store } from "./store";
import { Tag } from "./txTags";

////////////////////////////////////////
// JSON Schema

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
  tag: Tag,
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
  store?: Store;
};

export type Transactions = {
  json: TransactionsJson;
  mergeCsv: (csvData: string, parser?: CsvParser) => void;
  merge: (transactions: TransactionsJson) => void;
};
