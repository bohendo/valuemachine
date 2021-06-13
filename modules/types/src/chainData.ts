import {
  Address,
  Bytes32,
  DecimalString,
  HexString,
  TimestampString
} from "./strings";

export type EthCall = {
  block: number;
  contractAddress: Address; // AddressZero if ETH
  from: Address;
  hash: Bytes32;
  timestamp: TimestampString;
  to: Address;
  value: DecimalString;
};

export type EthTransactionLog = {
  address: Address;
  data: HexString;
  index: number;
  topics: Array<Bytes32>;
}

export type EthTransaction = {
  block: number;
  data: HexString;
  from: Address;
  gasLimit: HexString;
  gasPrice: HexString;
  gasUsed: HexString;
  hash: Bytes32;
  index: number;
  logs: EthTransactionLog[];
  nonce: number;
  status: number | undefined;
  timestamp: TimestampString;
  to: Address | null;
  value: DecimalString;
};

export type TokenData = {
  decimals: number;
  name: string;
  symbol: string;
}

export type ChainDataJson = {
  addresses: {
    [address: string]: {
      history: Bytes32[]; /* List of tx hashes that interact with this address */
      lastUpdated: TimestampString;
    };
  };
  calls: EthCall[]; // Note: we can have multiple calls per txHash
  tokens: { [address: string]: TokenData };
  transactions: EthTransaction[];
};

export interface ChainData {
  getAddressHistory: (...addresses: Address[]) => ChainData;
  getDecimals: (token: Address) => number;
  getEthCall: (hash: Bytes32) => EthCall;
  getEthCalls: (testFn: (call: EthCall) => boolean) => EthCall[];
  getEthTransaction: (hash: Bytes32) => EthTransaction;
  getEthTransactions: (testFn: (tx: EthTransaction) => boolean) => EthTransaction[];
  getTokenData: (token: Address) => TokenData;
  json: ChainDataJson;
  merge: (newJson: ChainDataJson) => void;
  syncAddress: (address: Address, key?: string) => Promise<void>;
  syncAddresses: (addresses: Address[], key?: string) => Promise<void>;
  syncTokenData: (tokens: Address[], key?: string) => Promise<void>;
  syncTransaction: (tx: Partial<EthTransaction | EthCall>, key?: string) => Promise<void>;
}

export const emptyChainData = {
  addresses: {},
  calls: [],
  tokens: {},
  transactions: [],
} as ChainDataJson;
