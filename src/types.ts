import { Field, Forms } from "./mappings";
export { Field, Forms };

export type DateString = string; // eg "2020-02-27" aka TimestampString.split("T")[0] 
export type DecimalString = string; // eg "-3.1415"
export type HexString = string; // eg "0xabc123"
export type TimestampString = string; // eg "2020-02-27T09:51:30.444Z" (ISO 8601 format)
export type Address = HexString | null;

export type AssetChunk = {
  dateRecieved: TimestampString;
  purchasePrice: DecimalString; /* units of assetType per unit of account (USD/DAI) */
  quantity: DecimalString;
};

export type State = {
  [account: string]: {
    [assetType: string /* AssetType */]: Array<AssetChunk>;
  };
}

export type Event = {
  assetsIn: Asset[];
  assetsOut: Asset[];
  date: TimestampString;
  description?: string;
  from: string;
  hash?: HexString;
  prices: { [assetType: string]: DecimalString };
  sources: Set<Source>;
  tags: Set<EventTag>;
  to: string;
}

export type Asset = {
  assetType: AssetType;
  quantity: DecimalString;
}

export const Sources = {
  "coinbase": "coinbase",
  "coingecko": "coingecko",
  "ethCall": "ethCall",
  "ethLog": "ethLog",
  "ethTx": "ethTx",
  "sendwyre": "sendwyre",
};
export type Source = keyof typeof Sources | string;

export const EventTags = {
  "cdp": "cdp",
  "defi": "defi",
  "ignore": "ignore",
};
export type EventTag = keyof typeof EventTags | string;

export const AssetTypes = {
  "DAI": "DAI",
  "ETH": "ETH",
  "INR": "INR",
  "MKR": "MKR",
  "SAI": "SAI",
  "SNT": "SNT",
  "SNX": "SNX",
  "USD": "USD",
  "WETH": "WETH",
};
export type AssetType = keyof typeof AssetTypes | string;

export type Log = F8949Log | any;

// aka row of f8949
export type F8949Log = {
  type: "f8949";
  Adjustment: string;
  Code: string;
  Cost: string;
  DateAcquired: string;
  DateSold: string;
  Description: string;
  GainOrLoss: string;
  Proceeds: string;
}

////////////////////////////////////////
// Helpers & Source Data

export interface AddressBook {
  addresses: Array<{
    address: HexString;
    category: AddressCategory;
    name; string;
    tags: string[];
  }>;
  getName(address: Address): string;
  isCategory(address: Address, category: string): boolean;
  isTagged(address: Address, tag: string): boolean;
  isSelf(address: Address): boolean;
  shouldIgnore(address: Address): boolean;
  pretty(address: Address): string;
}

export const AddressTags = {
  "cdp": "cdp",
  "defi": "defi",
  "ignore": "ignore",
};
export type AddressTag = keyof typeof AddressTags | string;

export const AddressCategories = {
  "erc20": "erc20",
  "family": "family",
  "friend": "friend",
  "private": "private",
  "public": "public",
  "self": "self",
};
export type AddressCategory = keyof typeof AddressCategories;

export type PriceData = {
  ids: { [assetType: string]: string };
  [date: string]: {
    [assetType: string]: DecimalString;
  };
}

// format of chain-data.json
export type ChainData = {
  addresses: { [address: string]: DateString /* Date last updated */ };
  lastUpdated: TimestampString;
  transactions: { [hash: string]: TransactionData };
  calls: CallData[]; // We can have multiple calls per txHash
};

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
    category: AddressCategory;
    name; string;
    tags: string[];
  }>;
  env: Partial<Env>;
  events: Array<Event | string>;
  formData: Forms;
  forms: string[];
}

export type Env = {
  capitalGainsMethod: CapitalGainsMethod;
  etherscanKey: string;
  logLevel: number;
  mode: string;
  taxYear: string;
}

export const CapitalGainsMethods = {
  "FIFO": "FIFO",
  "HIFO": "HIFO",
  "LIFO": "LIFO",
};
export type CapitalGainsMethod = keyof typeof CapitalGainsMethods;

export type FinancialData = {
  expenses: Array<Log>;
  income: Array<Log>;
  trades: Array<Log>;
}
