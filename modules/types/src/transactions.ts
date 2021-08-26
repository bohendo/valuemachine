import { Static, Type } from "@sinclair/typebox";

import { AddressBook } from "./addressBook";
import { EvmMetadata, EvmTransaction } from "./evmData";
import { Logger } from "./logger";
import { DigitalGuards, Guards } from "./guards";
import { Account, Asset, Bytes32, DecimalString, TimestampString } from "./strings";
import { Store } from "./store";

////////////////////////////////////////
// JSON Schema

export const CsvSources = {
  Coinbase: "Coinbase",
  DigitalOcean: "DigitalOcean",
  Wyre: "Wyre",
  Wazirx: "Wazirx",
} as const;
export const CsvSource = Type.String(); // Extensible
export type CsvSource = Static<typeof CsvSource>;

// Set default guards for csv sources
export const guards = {
  [CsvSources.Coinbase]: Guards.USA,
  [CsvSources.DigitalOcean]: Guards.USA,
  [CsvSources.Wyre]: Guards.USA,
  [CsvSources.Wazirx]: Guards.IND,
};

export const ChainSources = {
  ...DigitalGuards,
} as const;
export const ChainSource = Type.String(); // Extensible
export type ChainSource = Static<typeof ChainSource>;

export const TransactionSources = {
  ...CsvSources,
  ...ChainSources,
} as const;
export const TransactionSource = Type.String();
export type TransactionSource = Static<typeof TransactionSource>;

export const TransferCategories = {
  Internal: "Internal",
  Unknown: "Unknown",
  Expense: "Expense",
  Income: "Income",
  SwapIn: "SwapIn",
  SwapOut: "SwapOut",
  Borrow: "Borrow",
  Repay: "Repay",
  Deposit: "Deposit",
  Withdraw: "Withdraw",
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
  mergeCsv: (csvData: string, parser: CsvSource | CsvParser) => void;
  merge: (transactions: TransactionsJson) => void;
};
