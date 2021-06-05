import { Assets, AssetChunk } from "./assets";
import { Address, DecimalString, TimestampString } from "./strings";
import { TransferCategory } from "./transactions";
import { enumify } from "./utils";

export const EventTypes = enumify({
  Trade: "Trade",
  Transfer: "Transfer",
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EventTypes = (typeof EventTypes)[keyof typeof EventTypes];

type BaseEvent = {
  date: TimestampString;
  description: string;
  newBalances: { [account: string]: { [asset: string]: DecimalString } };
  type: EventTypes;
  tags: string[];
};

type TransferEvent = BaseEvent & {
  asset: Assets;
  assetPrice: DecimalString;
  category: TransferCategory;
  from: Address;
  quantity: DecimalString;
  to: Address;
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

export type Event = TransferEvent | TradeEvent
export type Events = Event[];

export type EventsJson = Events;

export const emptyEvents = [] as Events;
