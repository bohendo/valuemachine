import { Assets } from "./assets";
import { Address, DecimalString, TimestampString } from "./strings";
import { enumify } from "./utils";

export const EventTypes = enumify({
  Borrow: "Borrow", // eg minting dai from cdp or borrowing from compound
  CapitalGains: "CapitalGains",
  Deposit: "Deposit", // eg dai->dsr or eth->compound
  Expense: "Expense",
  Income: "Income",
  NetWorth: "NetWorth",
  Repay: "Repay",
  Trade: "Trade",
  Withdraw: "Withdraw",
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EventTypes = (typeof EventTypes)[keyof typeof EventTypes];

type BaseEvent = {
  assetPrice: DecimalString;
  asset: Assets;
  date: TimestampString;
  description: string;
  quantity: DecimalString;
  tags: string[];
  type: EventTypes;
}

export type BorrowEvent = BaseEvent & {
  from: Address;
  type: typeof EventTypes.Borrow;
}

export type CapitalGainsEvent = BaseEvent & {
  gain: DecimalString;
  purchaseDate: TimestampString;
  purchasePrice: DecimalString;
  type: typeof EventTypes.CapitalGains;
}

export type DepositEvent = BaseEvent & {
  to: Address;
  type: typeof EventTypes.Deposit;
}

export type ExpenseEvent = BaseEvent & {
  to: Address;
  type: typeof EventTypes.Expense;
}

export type IncomeEvent = BaseEvent & {
  from: Address;
  type: typeof EventTypes.Income;
}

export type RepayEvent = BaseEvent & {
  to: Address;
  type: typeof EventTypes.Repay;
}

export type WithdrawEvent = BaseEvent & {
  from: Address;
  type: typeof EventTypes.Withdraw;
}

export type TradeEvent = {
  date: TimestampString;
  description: string;
  swapsIn: { [asset: string]: DecimalString };
  swapsOut: { [asset: string]: DecimalString };
  type: typeof EventTypes.Trade;
}

export type NetWorthEvent = {
  assets: { [asset: string]: DecimalString };
  date: TimestampString;
  quantity: DecimalString;
  type: typeof EventTypes.NetWorth;
}

export type Event =
  | BorrowEvent
  | CapitalGainsEvent
  | DepositEvent
  | ExpenseEvent
  | IncomeEvent
  | RepayEvent
  | TradeEvent
  | NetWorthEvent
  | WithdrawEvent;
export type Events = Event[];

export type EventsJson = Events;

export const emptyEvents = [] as Events;
