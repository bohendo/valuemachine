import { Static, Type } from "@sinclair/typebox";

import { AddressBook } from "./addressBook";
import { EvmMetadata, EvmTransaction } from "./evmData";
import { Logger } from "./logger";
import {
  Account,
  Amount,
  Asset,
  TimestampString,
  TransactionSource,
} from "./strings";
import { Store } from "./store";

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
  index: Type.Optional(Type.Number()),
  to: Account,
});
export type Transfer = Static<typeof Transfer>;

export const Transaction = Type.Object({
  apps: Type.Array(Type.String()),
  date: TimestampString,
  uuid: Type.String(),
  index: Type.Optional(Type.Number()), // required after merging txns together
  method: Type.String(),
  sources: Type.Array(TransactionSource),
  transfers: Type.Array(Transfer),
});
export type Transaction = Static<typeof Transaction>;

export const TransactionsJson = Type.Array(Transaction);
export type TransactionsJson = Static<typeof TransactionsJson>;

////////////////////////////////////////
// Function Interfaces

export type CsvParser = (
  txns: Transaction[],
  csvData: string,
  logger: Logger,
) => Transaction;

export type EvmParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
) => Transaction;

export type EvmParsers = {
  insert: EvmParser[];
  modify: EvmParser[];
};

export type TransactionsParams = {
  json?: TransactionsJson;
  logger?: Logger;
  store?: Store;
};

export type Transactions = {
  json: TransactionsJson;
  mergeCsv: (csvData: string, parser: TransactionSource | CsvParser) => void;
  merge: (transactions: TransactionsJson) => void;
};
