// see: https://github.com/microsoft/TypeScript/issues/3192#issuecomment-261720275
export const enumify = <
  T extends {[index: string]: U},
  U extends string
>(x: T): T => x;

export const LogTypes = enumify({
  Borrow: "Borrow", // eg minting dai from cdp or borrowing from compound
  Burn: "Burn",
  CapitalGains: "CapitalGains",
  Deposit: "Deposit", // eg dai->dsr or eth->compound
  Expense: "Expense",
  GiftIn: "GiftIn",
  GiftOut: "GiftOut",
  Income: "Income",
  Lock: "Lock",
  Mint: "Mint",
  Repay: "Repay",
  SwapIn: "SwapIn",
  SwapOut: "SwapOut",
  Unlock: "Unlock",
  Withdraw: "Withdraw",
});
export type LogTypes = (typeof LogTypes)[keyof typeof LogTypes];

export const EventSources = enumify({
  CoinGecko: "CoinGecko",
  Coinbase: "Coinbase",
  EthCall: "EthCall",
  EthTx: "EthTx",
  Personal: "Personal",
  SendWyre: "SendWyre",
});
export type EventSources = (typeof EventSources)[keyof typeof EventSources];

export const AssetTypes = enumify({
  DAI: "DAI",
  ETH: "ETH",
  INR: "INR",
  MKR: "MKR",
  SAI: "SAI",
  SNT: "SNT",
  SNX: "SNX",
  USD: "USD",
  WETH: "WETH",
});
export type AssetTypes = (typeof AssetTypes)[keyof typeof AssetTypes];

export const TransferCategories = enumify({
  Borrow: "Borrow", // eg minting dai from cdp or borrowing from compound
  Burn: "Burn",
  Deposit: "Deposit", // eg dai->dsr or eth->compound
  Gift: "Gift",
  Ignore: "Ignore",
  Lock: "Lock",
  Mint: "Mint",
  Repay: "Repay",
  SwapIn: "SwapIn",
  SwapOut: "SwapOut",
  Transfer: "Transfer",
  Unlock: "Unlock",
  Withdraw: "Withdraw",
});
export type TransferCategories = (typeof TransferCategories)[keyof typeof TransferCategories];
