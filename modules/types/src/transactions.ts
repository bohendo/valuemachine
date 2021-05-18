import { AddressBook } from "./addressBook";
import { AssetTypes } from "./assets";
import { ChainData } from "./chainData";
import { Logger } from "./logger";
import { PriceList } from "./prices";
import { DecimalString, HexString, TimestampString } from "./strings";
import { Store } from "./store";
import { enumify } from "./utils";

////////////////////////////////////////
// Transactions

export const ExternalSources = enumify({
  Coinbase: "Coinbase",
  DigitalOcean: "DigitalOcean",
  External: "External",
  Wyre: "Wyre",
  Wazirx: "Wazirx",
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ExternalSources = (typeof ExternalSources)[keyof typeof ExternalSources];

export const OnchainSources = enumify({
  Compound: "Compound",
  ERC20: "ERC20",
  EthTx: "EthTx",
  Maker: "Maker",
  Oasis: "Oasis",
  Uniswap: "Uniswap",
  Weth: "Weth",
  Yearn: "Yearn",
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type OnchainSources = (typeof OnchainSources)[keyof typeof OnchainSources];

export const TransactionSources = enumify({
  ...ExternalSources,
  ...OnchainSources,
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type TransactionSources = (typeof TransactionSources)[keyof typeof TransactionSources];

export const TransferCategories = enumify({
  Borrow: "Borrow", // eg minting dai from cdp or borrowing from compound
  Burn: "Burn",
  Deposit: "Deposit", // eg dai->dsr or eth->compound
  Expense: "Expense",
  GiftIn: "GiftIn",
  GiftOut: "GiftOut",
  Income: "Income",
  Ignore: "Ignore",
  Mint: "Mint",
  Repay: "Repay",
  SwapIn: "SwapIn",
  SwapOut: "SwapOut",
  Transfer: "Transfer",
  Withdraw: "Withdraw",
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type TransferCategories = (typeof TransferCategories)[keyof typeof TransferCategories];

export type Transfer = {
  assetType: AssetTypes;
  category: TransferCategories;
  fee?: DecimalString;
  from: HexString;
  index?: number;
  quantity: DecimalString;
  to: HexString;
}

export type Transaction = {
  date: TimestampString;
  description: string;
  hash?: HexString;
  index?: number;
  prices?: PriceList;
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
