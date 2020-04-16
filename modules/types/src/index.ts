////////////////////////////////////////
// Level 0: Simple Utils, no dependencies

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

export type PriceData = {
  ids: { [assetType: string]: string };
  [date: string]: {
    [assetType: string]: DecimalString;
  };
}

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
