import { AssetTypes } from "./assets";
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
  Personal: "Personal",
  SendWyre: "SendWyre",
});
export type TransactionSources = (typeof TransactionSources)[keyof typeof TransactionSources];

export const TransferCategories = enumify({
  Borrow: "Borrow", // eg minting dai from cdp or borrowing from compound
  Burn: "Burn",
  Deposit: "Deposit", // eg dai->dsr or eth->compound
  Gift: "Gift",
  Ignore: "Ignore",
  Mint: "Mint",
  Repay: "Repay",
  SwapIn: "SwapIn",
  SwapOut: "SwapOut",
  Transfer: "Transfer",
  Withdraw: "Withdraw",
});
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
export type Transactions = Transaction[];

export type TransactionsJson = Transactions;

export const emptyTransactions = [] as Transactions;
