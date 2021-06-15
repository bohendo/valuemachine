import { AddressBook } from "./addressBook";
import { Asset } from "./assets";
import { ChainData } from "./chainData";
import { Logger } from "./logger";
import { Account, Bytes32, DecimalString, TimestampString } from "./strings";
import { Store } from "./store";
import { SecurityProviders } from "./security";
import { enumify } from "./utils";

////////////////////////////////////////
// Transaction Sources

export const ExternalSources = enumify({
  Coinbase: "Coinbase",
  DigitalOcean: "DigitalOcean",
  Wyre: "Wyre",
  Wazirx: "Wazirx",
});
export type ExternalSource = (typeof ExternalSources)[keyof typeof ExternalSources];

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

export const TransactionSources = enumify({
  ...ExternalSources,
  ...EthereumSources,
});
export type TransactionSource = (typeof TransactionSources)[keyof typeof TransactionSources];

// Set default guardians for external sources
export const jurisdictions = {
  [ExternalSources.Coinbase]: SecurityProviders.USD,
  [ExternalSources.DigitalOcean]: SecurityProviders.USD,
  [ExternalSources.Wyre]: SecurityProviders.USD,
  [ExternalSources.Wazirx]: SecurityProviders.INR,
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

export type TransactionParams = {
  addressBook: AddressBook;
  logger?: Logger;
  store?: Store;
  transactionsJson?: TransactionsJson;
};

export type Transactions = {
  getJson: () => TransactionsJson;
  mergeEthereum: (chainData: ChainData) => void;
  mergeCsv: (source: ExternalSource, csvData: string) => void;
  merge: (transactions: TransactionsJson) => void;
};

export const emptyTransactions = [] as TransactionsJson;
