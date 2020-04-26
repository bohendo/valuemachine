import { AssetTypes } from "./assets";
import { DecimalString, HexString, TimestampString } from "./strings";
import { enumify } from "./utils";

////////////////////////////////////////
// Events

export const EventSources = enumify({
  CoinGecko: "CoinGecko",
  Coinbase: "Coinbase",
  DigitalOcean: "DigitalOcean",
  EthCall: "EthCall",
  EthTx: "EthTx",
  Personal: "Personal",
  SendWyre: "SendWyre",
});
export type EventSources = (typeof EventSources)[keyof typeof EventSources];

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

export type Transfer = {
  assetType: AssetTypes;
  category: TransferCategories;
  fee?: DecimalString;
  from: HexString;
  index?: number;
  quantity: DecimalString;
  to: HexString;
}

export type Event = {
  date: TimestampString;
  description: string;
  hash?: HexString;
  index: number;
  prices: { [assetType: string]: DecimalString };
  sources: EventSources[];
  tags: string[];
  transfers: Transfer[];
}
export type Events = Event[];

export const emptyEvents = [] as Events;
