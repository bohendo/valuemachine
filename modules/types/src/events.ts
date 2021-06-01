import { Assets, AssetChunk } from "./assets";
import { Address, DecimalString, TimestampString } from "./strings";
import { enumify } from "./utils";

export const EventTypes = enumify({
  Income: "Income",
  Expense: "Expense",
  Borrow: "Borrow",
  Repay: "Repay",
  Deposit: "Deposit",
  Withdraw: "Withdraw",
  Trade: "Trade",
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EventTypes = (typeof EventTypes)[keyof typeof EventTypes];

type BaseEvent = {
  date: TimestampString;
  description: string;
  type: EventTypes;
  tags: string[];
};

type TransferEvent = BaseEvent & {
  asset: Assets;
  assetPrice: DecimalString;
  from: Address;
  quantity: DecimalString;
  to: Address;
}

////////////////////////////////////////

export type IncomeEvent = TransferEvent & {
  type: typeof EventTypes.Income;
}

export type ExpenseEvent = TransferEvent & {
  type: typeof EventTypes.Expense;
}

export type DepositEvent = TransferEvent & {
  type: typeof EventTypes.Deposit;
}

export type WithdrawEvent = TransferEvent & {
  type: typeof EventTypes.Withdraw;
}

export type BorrowEvent = TransferEvent & {
  type: typeof EventTypes.Borrow;
}

export type RepayEvent = TransferEvent & {
  type: typeof EventTypes.Repay;
}

export type TradeEvent = BaseEvent & {
  inputs: { [asset: string]: DecimalString };
  to: Address;
  from: Address;
  outputs: { [asset: string]: DecimalString };
  prices: { [asset: string]: DecimalString };
  spentChunks: AssetChunk[];
  type: typeof EventTypes.Trade;
}

export type Event =
  | BorrowEvent
  | DepositEvent
  | ExpenseEvent
  | IncomeEvent
  | RepayEvent
  | TradeEvent
  | WithdrawEvent;
export type Events = Event[];

export type EventsJson = Events;

export const emptyEvents = [] as Events;
