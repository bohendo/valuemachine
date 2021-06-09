import { AddressBook } from "./addressBook";
import { Assets } from "./assets";
import { ChainData } from "./chainData";
import { Logger } from "./logger";
import { DecimalString, HexString, TimestampString } from "./strings";
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
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ExternalSources = (typeof ExternalSources)[keyof typeof ExternalSources];

export const Jurisdictions = {
  [ExternalSources.Coinbase]: SecurityProviders.USD,
  [ExternalSources.DigitalOcean]: SecurityProviders.USD,
  [ExternalSources.Wyre]: SecurityProviders.USD,
  [ExternalSources.Wazirx]: SecurityProviders.INR,
};

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
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EthereumSources = (typeof EthereumSources)[keyof typeof EthereumSources];

export const TransactionSources = enumify({
  ...ExternalSources,
  ...EthereumSources,
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type TransactionSources = (typeof TransactionSources)[keyof typeof TransactionSources];

////////////////////////////////////////
// Transfers

export const TransferCategories = enumify({
  Internal: "Internal",
  Unknown: "Unknown",

  Expense: "Expense",
  Income: "Income",

  SwapIn: "SwapIn",
  SwapOut: "SwapOut",

  Borrow: "Borrow", // eg minting dai from cdp or borrowing from compound
  Repay: "Repay",

  Deposit: "Deposit", // eg dai->dsr or eth->compound
  Withdraw: "Withdraw",

});
export type TransferCategory = (typeof TransferCategories)[keyof typeof TransferCategories];

export type Transfer = {
  asset: Assets;
  category: TransferCategory;
  from: HexString;
  index?: number;
  quantity: DecimalString;
  to: HexString;
}

////////////////////////////////////////
// Transactions

export type Transaction = {
  date: TimestampString;
  description: string;
  hash?: HexString;
  index?: number;
  sources: TransactionSources[];
  tags: string[];
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
  json: TransactionsJson;
  mergeChainData: (chainData: ChainData) => Promise<void>;
  mergeCoinbase: (csvData: string) => Promise<void>;
  mergeDigitalOcean: (csvData: string) => Promise<void>;
  mergeTransactions: (transactions: TransactionsJson) => Promise<void>;
  mergeWazirx: (csvData: string) => Promise<void>;
  mergeWyre: (csvData: string) => Promise<void>;
};

export const emptyTransactions = [] as TransactionsJson;
