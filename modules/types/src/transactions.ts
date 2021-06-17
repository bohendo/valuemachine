import { AddressBook } from "./addressBook";
import { Asset } from "./assets";
import { ChainData, EthTransaction } from "./chainData";
import { Logger } from "./logger";
import { Account, Bytes32, DecimalString, TimestampString } from "./strings";
import { Store } from "./store";
import { SecurityProviders } from "./security";
import { enumify } from "./utils";

////////////////////////////////////////
// Transaction Sources

export const CsvSources = enumify({
  Coinbase: "Coinbase",
  DigitalOcean: "DigitalOcean",
  Wyre: "Wyre",
  Wazirx: "Wazirx",
});
export type CsvSource = (typeof CsvSources)[keyof typeof CsvSources];

export type CsvParser = (
  txns: Transaction[],
  csvData: string,
  logger: Logger,
) => Transaction;

export const EthereumSources = enumify({
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
});
export type EthereumSource = (typeof EthereumSources)[keyof typeof EthereumSources];

export type EthParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
) => Transaction;

export const TransactionSources = enumify({
  ...CsvSources,
  ...EthereumSources,
});
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

export const TransferCategories = enumify({
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
});
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
  addressBook: AddressBook;
  json?: TransactionsJson;
  logger?: Logger;
  store?: Store;
};

export type Transactions = {
  json: TransactionsJson;
  mergeEthereum: (chainData: ChainData, extraParsers?: EthParser[]) => void;
  mergeCsv: (csvData: string, parser: CsvSource | CsvParser) => void;
  merge: (transactions: TransactionsJson) => void;
};

export const emptyTransactions = [] as TransactionsJson;
