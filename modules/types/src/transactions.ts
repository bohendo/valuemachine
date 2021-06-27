import { Static } from "@sinclair/typebox";

import { AddressBook } from "./addressBook";
import { Asset } from "./assets";
import { EthTransaction } from "./chainData";
import { Logger } from "./logger";
import { Account, Bytes32, DecimalString, TimestampString } from "./strings";
import { Store } from "./store";
import { SecurityProviders } from "./security";
import { enumToSchema } from "./utils";

////////////////////////////////////////
// Transaction Sources

export const CsvSources = {
  Coinbase: "Coinbase",
  DigitalOcean: "DigitalOcean",
  Wyre: "Wyre",
  Wazirx: "Wazirx",
} as const;
export const CsvSourceSchema = enumToSchema(CsvSources);
export type CsvSources = Static<typeof CsvSourceSchema>;
export type CsvSource = (typeof CsvSources)[keyof typeof CsvSources];

export type CsvParser = (
  txns: Transaction[],
  csvData: string,
  logger: Logger,
) => Transaction;

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

export type EthParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  logger: Logger,
) => Transaction;

export const TransactionSources = {
  ...CsvSources,
  ...EthereumSources,
} as const;
export const TransactionSourceSchema = enumToSchema(TransactionSources);
export type TransactionSources = Static<typeof TransactionSourceSchema>;
export type TransactionSource = (typeof TransactionSources)[keyof typeof TransactionSources];

// Set default guardians for external sources
export const jurisdictions = {
  [CsvSources.Coinbase]: SecurityProviders.USD,
  [CsvSources.DigitalOcean]: SecurityProviders.USD,
  [CsvSources.Wyre]: SecurityProviders.USD,
  [CsvSources.Wazirx]: SecurityProviders.INR,
};

////////////////////////////////////////
// Transfers

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
};
export type TransferCategory = (typeof TransferCategories)[keyof typeof TransferCategories];

export type Transfer = {
  asset: Asset;
  category: TransferCategory;
  from: Account;
  index?: number;
  quantity: DecimalString;
  to: Account;
}

////////////////////////////////////////
// Transactions

export type Transaction = {
  date: TimestampString;
  method?: string;
  hash?: Bytes32; // Convert to UUID
  index?: number;
  sources: TransactionSource[];
  transfers: Transfer[];
}
export type TransactionsJson = Transaction[];

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
