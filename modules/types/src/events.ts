import { AssetTypes } from "./assets";
import { Address, DecimalString, TimestampString } from "./strings";
import { enumify } from "./utils";

export const EventTypes = enumify({
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
export type EventTypes = (typeof EventTypes)[keyof typeof EventTypes];

type BaseEvent = {
  assetPrice: DecimalString;
  assetType: AssetTypes;
  date: TimestampString;
  description: string;
  quantity: DecimalString;
  type: EventTypes;
}

export type BorrowEvent = BaseEvent & {
  from: Address;
  type: typeof EventTypes.Borrow;
}

export type BurnEvent = BaseEvent & {
  from: Address;
  type: typeof EventTypes.Burn;
}

export type CapitalGainsEvent = BaseEvent & {
  purchaseDate: TimestampString;
  purchasePrice: DecimalString;
  type: typeof EventTypes.CapitalGains;
}

export type DepositEvent = BaseEvent & {
  to: Address;
  type: typeof EventTypes.Deposit;
}

export type ExpenseEvent = BaseEvent & {
  taxTags: string[];
  to: Address;
  type: typeof EventTypes.Expense;
}

export type GiftInEvent = BaseEvent & {
  from: Address;
  type: typeof EventTypes.GiftIn;
}

export type GiftOutEvent = BaseEvent & {
  to: Address;
  type: typeof EventTypes.GiftOut;
}

export type IncomeEvent = BaseEvent & {
  from: Address;
  taxTags: string[];
  type: typeof EventTypes.Income;
}

export type MintEvent = BaseEvent & {
  to: Address;
  type: typeof EventTypes.Mint;
}

export type RepayEvent = BaseEvent & {
  to: Address;
  type: typeof EventTypes.Repay;
}

export type SwapInEvent = BaseEvent & {
  from: Address;
  type: typeof EventTypes.SwapIn;
}

export type SwapOutEvent = BaseEvent & {
  to: Address;
  type: typeof EventTypes.SwapOut;
}

export type WithdrawEvent = BaseEvent & {
  from: Address;
  type: typeof EventTypes.Withdraw;
}

export type NetWorthEvent = {
  assets: { [assetType: string]: DecimalString };
  date: TimestampString;
  prices: { [assetType: string]: DecimalString };
  quantity: DecimalString;
  type: typeof EventTypes.NetWorth;
}

export type Event =
  | BorrowEvent
  | BurnEvent
  | CapitalGainsEvent
  | DepositEvent
  | ExpenseEvent
  | GiftInEvent
  | GiftOutEvent
  | IncomeEvent
  | MintEvent
  | RepayEvent
  | SwapInEvent
  | SwapOutEvent
  | NetWorthEvent
  | WithdrawEvent;
export type Events = Event[];

export type EventsJson = Events;

export const emptyEvents = [] as Events;
