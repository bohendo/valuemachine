import { Static, Type } from "@sinclair/typebox";

import { AddressBook } from "./addressBook";
import { EvmMetadata, EvmTransaction } from "./evmData";
import { Logger } from "./logger";
import {
  Account,
  Asset,
  Bytes32,
  DecimalString,
  TimestampString,
  TransactionSource,
} from "./strings";
import { Store } from "./store";

////////////////////////////////////////
// JSON Schema

export const TransferCategories = {
  Internal: "Internal",
  Unknown: "Unknown",
  Expense: "Expense",
  Income: "Income",
  Refund: "Refund",
  SwapIn: "SwapIn",
  SwapOut: "SwapOut",
  Borrow: "Borrow",
  Repay: "Repay",
} as const;
export const TransferCategory = Type.Enum(TransferCategories); // NOT Extensible
export type TransferCategory = Static<typeof TransferCategory>;

export const Transfer = Type.Object({
  asset: Asset,
  category: TransferCategory,
  from: Account,
  index: Type.Optional(Type.Number()),
  quantity: DecimalString,
  to: Account,
});
export type Transfer = Static<typeof Transfer>;

export const Transaction = Type.Object({
  apps: Type.Array(Type.String()),
  date: TimestampString,
  hash: Type.Optional(Bytes32), // add guard prefix to convert to uuid??
  index: Type.Optional(Type.Number()),
  method: Type.Optional(Type.String()), // improves human-readability
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
