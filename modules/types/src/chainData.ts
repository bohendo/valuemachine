import { Address, DateString, DecimalString, HexString, TimestampString } from "./strings";

export type CallData = {
  block: number;
  contractAddress: Address; // AddressZero if ETH
  from: Address;
  hash: HexString;
  timestamp: TimestampString;
  to: Address;
  value: DecimalString;
};

export type TransactionLog = {
  address: Address;
  data: HexString;
  index: number;
  topics: Array<HexString>;
}

export type EthTransaction = {
  block: number;
  data: HexString;
  from: Address;
  gasLimit: HexString;
  gasPrice: HexString;
  gasUsed?: HexString;
  hash: HexString;
  index?: number;
  logs?: TransactionLog[];
  nonce: number;
  status?: number | undefined;
  timestamp: TimestampString;
  to: Address | null;
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
  transactions: EthTransaction[];
};

export const emptyChainData = {
  addresses: {},
  calls: [],
  tokens: {},
  transactions: [],
} as ChainData;
