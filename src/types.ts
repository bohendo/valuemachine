import { Field, Forms } from "./mappings";
import {
  AddressCategories,
  AddressTags,
  AssetTypes,
  CapitalGainsMethods,
  EventSources,
  EventTags,
  Modes,
} from "./enums";

export { Field, Forms };
export {
  AddressCategories,
  AddressTags,
  AssetTypes,
  CapitalGainsMethods,
  EventSources,
  EventTags,
  Modes,
};

export type DateString = string; // eg "2020-02-27" aka TimestampString.split("T")[0] 
export type DecimalString = string; // eg "-3.1415"
export type HexString = string; // eg "0xabc123"
export type TimestampString = string; // eg "2020-02-27T09:51:30.444Z" (ISO 8601 format)
export type Address = HexString | null;

export type Checkpoint = {
  account: Address;
  assetType: AssetTypes;
  balance: DecimalString;
  date: TimestampString;
  hash: HexString;
}

export type AssetChunk = {
  assetType: AssetTypes;
  dateRecieved: TimestampString;
  purchasePrice: DecimalString; /* units of account (USD/DAI) per 1 assetType */
  quantity: DecimalString;
};

export type Log = F8949Log | any;

// aka row of f8949
export type F8949Log = {
  Adjustment?: string;
  Code?: string;
  Cost: string;
  DateAcquired: string;
  DateSold: string;
  Description: string;
  GainOrLoss: string;
  Proceeds: string;
  type: "f8949";
}

export type Event = {
  date: TimestampString;
  description: string;
  hash?: HexString;
  prices: { [assetType: string]: DecimalString };
  sources: EventSources[];
  tags: EventTags[];
  transfers: Transfer[];
}
export type Events = Event[];

export type Transfer = {
  assetType: AssetTypes;
  index?: number;
  quantity: DecimalString;
  fee?: DecimalString;
  from: HexString;
  to: HexString;
}

export type StateJson = {
  [account: string]: Array<AssetChunk>;
}

export type StateBalances = {
  [account: string]: {
    [assetType: string]: DecimalString;
  };
}

export type NetWorth = { [assetType: string]: DecimalString };

export interface State {
  getAllBalances(): StateBalances;
  getBalance(account: string, assetType: AssetTypes): DecimalString;
  getChunks(
    account: Address,
    assetType: AssetTypes,
    quantity: DecimalString,
    event: Event,
  ): AssetChunk[];
  getNetWorth(): NetWorth;
  getRelevantBalances(event: Event): StateBalances;
  putChunk(account: string, chunk: AssetChunk): void;
  toJson(): StateJson;
}

////////////////////////////////////////
// Helpers & Source Data

export interface AddressBook {
  addresses: Address[];
  getName(address: Address): string;
  isCategory(category: string): (address: Address) => boolean;
  isTagged(tag: string): (address: Address) => boolean;
  isSelf(address: Address): boolean;
  shouldIgnore(address: Address): boolean;
  pretty(address: Address): string;
}

export type Prices = {
  ids: { [assetType: string]: string };
  [date: string]: {
    [assetType: string]: DecimalString;
  };
}

// format of chain-data.json
export type ChainData = {
  addresses: { [address: string]: DateString /* Date last updated */ };
  lastUpdated: TimestampString;
  transactions: { [txHash: string]: TransactionData };
  calls: CallData[]; // We can have multiple calls per txHash
};

// TODO use Partial<> type instead of making some props optional
export type TransactionData = {
  block: number;
  data: HexString;
  from: HexString;
  gasLimit: HexString;
  gasPrice: HexString;
  gasUsed?: HexString;
  hash: HexString;
  index?: number;
  logs?: Array<{
    address: HexString;
    data: HexString;
    index: number;
    topics: Array<HexString>;
  }>;
  nonce: number;
  status?: number | undefined;
  timestamp: TimestampString;
  to: HexString | null;
  value: DecimalString;
};

export type CallData = {
  block: number;
  contractAddress: HexString; // AddressZero if ETH
  from: HexString;
  hash: HexString;
  timestamp: TimestampString;
  to: HexString;
  value: DecimalString;
};

export type InputData = {
  addressBook?: Array<{
    address: HexString;
    category: AddressCategories;
    name; string;
    tags: string[];
  }>;
  env: Partial<Env>;
  events: Array<Event | string>;
  formData: Forms;
  forms: string[];
}

export type Env = {
  capitalGainsMethod: CapitalGainsMethods;
  etherscanKey: string;
  logLevel: number;
  mode: Modes;
  outputFolder: string;
  taxYear: string;
}

export type FinancialData = {
  expenses: Array<Log>;
  income: Array<Log>;
  trades: Array<Log>;
}
