import { Assets, AssetChunk } from "./assets";
import { Address, DecimalString, TimestampString } from "./strings";
import { SecurityProvider } from "./taxes";
import { TransferCategory } from "./transactions";
import { enumify } from "./utils";

export const EventTypes = enumify({
  JurisdictionChange: "JurisdictionChange",
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
  assetPrice: { [unit: string]: DecimalString };
  category: TransferCategory;
  from: Address;
  quantity: DecimalString;
  to: Address;
  type: typeof EventTypes.Transfer;
};

export type TradeEvent = BaseEvent & {
  inputs: { [asset: string]: DecimalString };
  account: Address;
  outputs: { [asset: string]: DecimalString };
  prices: { [unit: string]: { [asset: string]: DecimalString } };
  spentChunks: AssetChunk[];
  type: typeof EventTypes.Trade;
};

export type JurisdictionChangeEvent = BaseEvent & {
  oldJurisdiction: SecurityProvider;
  newJurisdiction: SecurityProvider;
  asset: Assets;
  movedChunks: AssetChunk[];
  oldPrice: DecimalString;
  newPrice: DecimalString;
  quantity: DecimalString;
  to: Address;
  from: Address;
  type: typeof EventTypes.JurisdictionChange;
};

export type Event = TransferEvent | TradeEvent | JurisdictionChangeEvent;
export type Events = Event[];

export type EventsJson = Events;

export const emptyEvents = [] as Events;
