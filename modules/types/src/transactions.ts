import { Static, Type } from "@sinclair/typebox";

import { AddressBook } from "./addressBook";
import { Asset } from "./assets";
import { EthTransaction } from "./evmData";
import { Logger } from "./logger";
import { Guards } from "./guards";
import { Account, Bytes32, DecimalString, TimestampString } from "./strings";
import { Store } from "./store";

////////////////////////////////////////
// JSON Schema

export const CsvSources = {
  Coinbase: "Coinbase",
  DigitalOcean: "DigitalOcean",
  Wyre: "Wyre",
  Wazirx: "Wazirx",
} as const;
export const CsvSource = Type.Enum(CsvSources);
export type CsvSource = Static<typeof CsvSource>;

// Set default guards for csv sources
export const guards = {
  [CsvSources.Coinbase]: Guards.USD,
  [CsvSources.DigitalOcean]: Guards.USD,
  [CsvSources.Wyre]: Guards.USD,
  [CsvSources.Wazirx]: Guards.INR,
};

export const EthereumSources = {
  Aave: "Aave",
  Argent: "Argent",
  Compound: "Compound",
  Idle: "Idle",
  ERC20: "ERC20",
  EthTx: "EthTx",
  EtherDelta: "EtherDelta",
  Maker: "Maker",
  Oasis: "Oasis",
  Tornado: "Tornado",
  Uniswap: "Uniswap",
  Weth: "Weth",
  Yearn: "Yearn",
} as const;
export const EthereumSource = Type.Enum(EthereumSources);
export type EthereumSource = Static<typeof EthereumSource>;

export const PolygonSources = {
  Polygon: "Polygon",
  Quickswap: "Quickswap",
} as const;
export const PolygonSource = Type.Enum(PolygonSources);
export type PolygonSource = Static<typeof PolygonSource>;

export const TransactionSources = {
  ...CsvSources,
  ...EthereumSources,
  ...PolygonSources,
} as const;
export const TransactionSource = Type.Union([
  Type.Enum(TransactionSources),
  Type.String(), // Allow arbitrary sources in app-level code
]);
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
export const TransferCategory = Type.Enum(TransferCategories);
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
  date: TimestampString,
  method: Type.Optional(Type.String()),
  hash: Type.Optional(Bytes32), // convert to uuid
  index: Type.Optional(Type.Number()),
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

export type EthParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  logger: Logger,
) => Transaction;

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
