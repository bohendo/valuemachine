import { AssetTypes } from "./assets";
import { Address, DecimalString, TimestampString } from "./strings";
import { enumify } from "./utils";

export const LogTypes = enumify({
  Borrow: "Borrow", // eg minting dai from cdp or borrowing from compound
  Burn: "Burn",
  CapitalGains: "CapitalGains",
  Deposit: "Deposit", // eg dai->dsr or eth->compound
  Expense: "Expense",
  GiftIn: "GiftIn",
  GiftOut: "GiftOut",
  Income: "Income",
  Mint: "Mint",
  NetWorth: "NetWorth",
  Repay: "Repay",
  SwapIn: "SwapIn",
  SwapOut: "SwapOut",
  Withdraw: "Withdraw",
});
export type LogTypes = (typeof LogTypes)[keyof typeof LogTypes];

export type BaseLog = {
  assetPrice: DecimalString;
  assetType: AssetTypes;
  date: TimestampString;
  description: string;
  quantity: DecimalString;
  type: LogTypes;
}

export type BorrowLog = BaseLog & {
  from: Address;
  type: typeof LogTypes.Borrow;
}

export type BurnLog = BaseLog & {
  from: Address;
  type: typeof LogTypes.Burn;
}

export type CapitalGainsLog = BaseLog & {
  purchaseDate: TimestampString;
  purchasePrice: DecimalString;
  type: typeof LogTypes.CapitalGains;
}

export type DepositLog = BaseLog & {
  to: Address;
  type: typeof LogTypes.Deposit;
}

export type ExpenseLog = BaseLog & {
  taxTags: string[];
  to: Address;
  type: typeof LogTypes.Expense;
}

export type GiftInLog = BaseLog & {
  from: Address;
  type: typeof LogTypes.GiftIn;
}

export type GiftOutLog = BaseLog & {
  to: Address;
  type: typeof LogTypes.GiftOut;
}

export type IncomeLog = BaseLog & {
  from: Address;
  taxTags: string[];
  type: typeof LogTypes.Income;
}

export type MintLog = BaseLog & {
  to: Address;
  type: typeof LogTypes.Mint;
}

export type RepayLog = BaseLog & {
  to: Address;
  type: typeof LogTypes.Repay;
}

export type SwapInLog = BaseLog & {
  from: Address;
  type: typeof LogTypes.SwapIn;
}

export type SwapOutLog = BaseLog & {
  to: Address;
  type: typeof LogTypes.SwapOut;
}

export type WithdrawLog = BaseLog & {
  from: Address;
  type: typeof LogTypes.Withdraw;
}

export type NetWorthLog = BaseLog & {
  assets: { [assetType: string]: DecimalString };
  date: TimestampString;
  prices: { [assetType: string]: DecimalString };
  type: typeof LogTypes.NetWorth;
}

export type Log =
  | BorrowLog
  | BurnLog
  | CapitalGainsLog
  | DepositLog
  | ExpenseLog
  | GiftInLog
  | GiftOutLog
  | IncomeLog
  | MintLog
  | RepayLog
  | SwapInLog
  | SwapOutLog
  | NetWorthLog
  | WithdrawLog;
export type Logs = Log[];

export const emptyLogs = [] as Logs;
