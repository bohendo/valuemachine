import { Field, Forms } from "./mappings";
export { Field, Forms };

export type DateString = string; // eg "2020-02-27" aka TimestampString.split("T")[0] 
export type DecimalString = string; // eg "-3.1415"
export type HexString = string; // eg "0xabc123"
export type TimestampString = string; // eg "2020-02-27T09:51:30.444Z" (ISO 8601 format)

export type State = {
  [address: string]: {
    [unit: string]: Array<{
      dateRecieved: AssetType;
      unitsPerUoa: AssetType;
      value: DecimalString;
    }>;
  };
}

export type Event = {
  assetsIn: Array<{ unit: AssetType; value: DecimalString }>;
  assetsOut: Array<{ unit: AssetType; value: DecimalString }>;
  date: TimestampString;
  description?: string;
  from: string;
  hash?: HexString;
  prices: { [assetType: string]: DecimalString };
  source: Set<Source>;
  tags: Set<string>;
  to: string;
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

export const Tags = {
  "cdp": "cdp",
  "defi": "defi",
  "ignore": "ignore",
};
export type Tag = keyof typeof Tags | string;

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

export type Log = Array<CapitalGain | any>;

// aka row of f8949
export type CapitalGain = {
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
  getName(address: string | null): string;
  isCategory(address: string | null, category: string): boolean;
  isTagged(address: string | null, tag: string): boolean;
  isSelf(address: string | null): boolean;
  shouldIgnore(address: string | null): boolean;
  pretty(address: string): string;
}

// format of chain-data.json
export type ChainData = {
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
  capitalGainsMethod: CapitalGainsMethod;
  etherscanKey?: string;
  events: Array<Event | string>;
  formData: Forms;
  forms: string[];
  logLevel?: number;
  taxYear: string;
}

export const CapitalGainsMethods = {
  "FIFO": "FIFO",
  "HIFO": "HIFO",
  "LIFO": "LIFO",
};
export type CapitalGainsMethod = keyof typeof CapitalGainsMethods;

export const AddressCategories = {
  "erc20": "erc20",
  "family": "family",
  "friend": "friend",
  "private": "private",
  "public": "public",
  "self": "self",
};
export type AddressCategory = keyof typeof AddressCategories;

export type FinancialData = {
  expenses: Array<Log>;
  income: Array<Log>;
  trades: Array<Log>;
}
