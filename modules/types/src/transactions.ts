import { AssetTypes } from "./assets";
import { ChainData } from "./chainData";
import { DecimalString, HexString, TimestampString } from "./strings";
import { enumify } from "./utils";

////////////////////////////////////////
// Transactions

export const TransactionSources = enumify({
  CoinGecko: "CoinGecko",
  Coinbase: "Coinbase",
  DigitalOcean: "DigitalOcean",
  EthCall: "EthCall",
  EthTx: "EthTx",
  Profile: "Profile",
  SendWyre: "SendWyre",
  Wazrix: "Wazrix",
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
  index: number;
  prices: { [assetType: string]: DecimalString };
  sources: TransactionSources[];
  tags: string[];
  transfers: Transfer[];
}
export type TransactionsJson = Transaction[];

export type Transactions = {
  json: TransactionsJson;
  mergeChainData: (chainData: ChainData) => Promise<void>;
  mergeCoinbase: (csvData: string) => Promise<void>;
  mergeDigitalOcean: (csvData: string) => Promise<void>;
  mergeWyre: (csvData: string) => Promise<void>;
  mergeWazrix: (csvData: string) => Promise<void>;
  mergeTransaction: (transactions: Partial<Transaction>) => Promise<void>;
};

export const emptyTransactions = [] as TransactionsJson;
