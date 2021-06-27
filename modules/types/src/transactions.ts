import { Static, Type } from "@sinclair/typebox";

import { AddressBook } from "./addressBook";
import { AssetSchema } from "./assets";
import { EthTransaction } from "./chainData";
import { Logger } from "./logger";
import { SecurityProviders } from "./security";
import { Account, Bytes32, DecimalString, TimestampString } from "./strings";
import { Store } from "./store";
import { enumToSchema } from "./utils";

////////////////////////////////////////
// JSON Schema

export const CsvSources = {
  Coinbase: "Coinbase",
  DigitalOcean: "DigitalOcean",
  Wyre: "Wyre",
  Wazirx: "Wazirx",
} as const;
export const CsvSourceSchema = enumToSchema(CsvSources);
export type CsvSources = Static<typeof CsvSourceSchema>;
export type CsvSource = (typeof CsvSources)[keyof typeof CsvSources];

// Set default guardians for external sources
export const jurisdictions = {
  [CsvSources.Coinbase]: SecurityProviders.USD,
  [CsvSources.DigitalOcean]: SecurityProviders.USD,
  [CsvSources.Wyre]: SecurityProviders.USD,
  [CsvSources.Wazirx]: SecurityProviders.INR,
};

export const EthereumSources = {
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
export const EthereumSourceSchema = enumToSchema(EthereumSources);
export type EthereumSources = Static<typeof EthereumSourceSchema>;
export type EthereumSource = (typeof EthereumSources)[keyof typeof EthereumSources];

export const TransactionSources = {
  ...CsvSources,
  ...EthereumSources,
} as const;
export const TransactionSourceSchema = enumToSchema(TransactionSources);
export type TransactionSources = Static<typeof TransactionSourceSchema>;
export type TransactionSource = (typeof TransactionSources)[keyof typeof TransactionSources];

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
export const TransferCategorySchema = enumToSchema(TransferCategories);
export type TransferCategories = Static<typeof TransferCategorySchema>;
export type TransferCategory = (typeof TransferCategories)[keyof typeof TransferCategories];

export const Transfer = Type.Object({
  asset: AssetSchema,
  category: TransferCategorySchema,
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
  sources: Type.Array(TransactionSourceSchema),
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
