// stolen from https://github.com/microsoft/TypeScript/issues/3192#issuecomment-261720275
export const enumify = <
  T extends {[index: string]: U},
  U extends string
>(x: T): T => x;

export const LogTypes = enumify({
  CapitalGains: "CapitalGains",
  Expense: "Expense",
  Income: "Income",
});
export type LogTypes = (typeof LogTypes)[keyof typeof LogTypes];

export const EventSources = enumify({
  CoinGecko: "CoinGecko",
  Coinbase: "Coinbase",
  EthCall: "EthCall",
  EthTx: "EthTx",
  Personal: "Personal",
  SendWyre: "SendWyre",
});
export type EventSources = (typeof EventSources)[keyof typeof EventSources];

export const AssetTypes = enumify({
  DAI: "DAI",
  ETH: "ETH",
  INR: "INR",
  MKR: "MKR",
  SAI: "SAI",
  SNT: "SNT",
  SNX: "SNX",
  USD: "USD",
  WETH: "WETH",
});
export type AssetTypes = (typeof AssetTypes)[keyof typeof AssetTypes];

////////////////////////////////////////
// Level 0: Simple Utils, no dependencies

export type FormDateString = string; // eg "02, 27, 2020" as required by form f8949 etc
export type DateString = string; // eg "2020-02-27" aka TimestampString.split("T")[0] 
export type DecimalString = string; // eg "-3.1415"
export type HexString = string; // eg "0xabc123"
export type TimestampString = string; // eg "2020-02-27T09:51:30.444Z" (ISO 8601 format)
export type Address = HexString | null; // eg null "to" during contract creation 
export type HexObject = { _hex: HexString }; // result of JSON.stringifying a BigNumber

////////////////////////////////////////
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

export type Transfer = {
  assetType: AssetTypes;
  index?: number;
  quantity: DecimalString;
  fee?: DecimalString;
  from: HexString;
  to: HexString;
  tags: Array<string>;
}

export type PriceData = {
  ids: { [assetType: string]: string };
  [date: string]: {
    [assetType: string]: DecimalString;
  };
}

export type AssetChunk = {
  assetType: AssetTypes;
  dateRecieved: TimestampString;
  purchasePrice: DecimalString; /* units of account (USD/DAI) per 1 assetType */
  quantity: DecimalString;
};

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

export type StateJson = {
  lastUpdated: TimestampString;
  accounts: { [account: string]: AssetChunk[] };
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

export const emptyPriceData = {ids: {} } as PriceData;

export const emptyChainData = {
  addresses: {},
  calls: [],
  tokens: {},
  transactions: [],
} as ChainData;

////////////////////////////////////////
// TODO: Implement new types in core to merge with dashboard
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
