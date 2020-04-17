import { AssetTypes, EventSources, LogTypes, TransferTags } from "./enums";

export * from "./empty";
export * from "./enums";

////////////////////////////////////////
// Simple util types

export type FormDateString = string; // eg "02, 27, 2020" as required by form f8949 etc
export type DateString = string; // eg "2020-02-27" aka TimestampString.split("T")[0] 
export type DecimalString = string; // eg "-3.1415"
export type HexString = string; // eg "0xabc123"
export type TimestampString = string; // eg "2020-02-27T09:51:30.444Z" (ISO 8601 format)
export type Address = HexString | null; // eg null "to" during contract creation 
export type HexObject = { _hex: HexString }; // result of JSON.stringifying a BigNumber

////////////////////////////////////////
// Chain Data

export type CallData = {
  block: number;
  contractAddress: HexString; // AddressZero if ETH
  from: HexString;
  hash: HexString;
  timestamp: TimestampString;
  to: HexString;
  value: DecimalString;
};

export type TransactionLog = {
  address: HexString;
  data: HexString;
  index: number;
  topics: Array<HexString>;
}

export type TransactionData = {
  block: number;
  data: HexString;
  from: HexString;
  gasLimit: HexString;
  gasPrice: HexString;
  gasUsed?: HexString;
  hash: HexString;
  index?: number;
  logs?: TransactionLog[];
  nonce: number;
  status?: number | undefined;
  timestamp: TimestampString;
  to: HexString | null;
  value: DecimalString;
};

export type TokenData = {
  decimals: number;
  name: string;
  symbol: string;
}

// format of chain-data.json
export type ChainData = {
  addresses: { [address: string]: DateString /* Date last updated */ };
  calls: CallData[]; // Note: we can have multiple calls per txHash
  tokens: { [address: string]: TokenData /* Date last updated */ };
  transactions: TransactionData[];
};

////////////////////////////////////////
// Events

export type Transfer = {
  assetType: AssetTypes;
  index?: number;
  quantity: DecimalString;
  fee?: DecimalString;
  from: HexString;
  to: HexString;
  tags: TransferTags[];
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

////////////////////////////////////////
// Prices

export type PriceData = {
  ids: { [assetType: string]: string };
  [date: string]: {
    [assetType: string]: DecimalString;
  };
}

////////////////////////////////////////
// State

export type AssetChunk = {
  assetType: AssetTypes;
  dateRecieved: TimestampString;
  purchasePrice: DecimalString; /* units of account (USD/DAI) per 1 assetType */
  quantity: DecimalString;
};

export type StateJson = {
  lastUpdated: TimestampString;
  accounts: { [account: string]: AssetChunk[] };
}

////////////////////////////////////////
// Logs

// used to fill in a row of f8949
export type CapitalGainsLog = {
  cost: DecimalString;
  date: FormDateString;
  dateRecieved: FormDateString;
  description: string;
  gainOrLoss: DecimalString;
  proceeds: DecimalString;
  type: typeof LogTypes.CapitalGains;
}

export type IncomeLog = {
  assetPrice: DecimalString;
  assetType: AssetTypes;
  date: FormDateString;
  from: Address;
  description: string;
  quantity: DecimalString;
  type: typeof LogTypes.Income;
}

export type ExpenseLog = {
  assetPrice: DecimalString;
  assetType: AssetTypes;
  date: FormDateString;
  description: string;
  quantity: DecimalString;
  to: Address;
  type: typeof LogTypes.Expense;
}

export type Log = CapitalGainsLog | IncomeLog | ExpenseLog;
export type Logs = Log[];

////////////////////////////////////////
// Dashboard Input

export type AssetTotal = {
  [assetType: string]: [number, number, number];
}

export type TotalByCategoryPerAssetType = {
  [category: string]: AssetTotal;
}
export type NetWorth = {
  [date: string]: AssetTotal;
}

export type NetGraphData = {
  lastUpdated: TimestampString;
  netWorth: NetWorth;
}
