import { Logger } from "./logger";
import { Store } from "./store";
import { AddressBook } from "./addressBook";
import { EthParser, Transaction, TransactionsJson } from "./transactions";
import {
  Address,
  Bytes32,
  DecimalString,
  HexString,
  TimestampString,
} from "./strings";

export type EthCall = {
  block: number;
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

export type ChainDataJson = {
  addresses: {
    [address: string]: {
      history: Bytes32[]; /* List of tx hashes that interact with this address */
      lastUpdated: TimestampString;
    };
  };
  calls: EthCall[]; // Note: we can have multiple calls per txHash
  transactions: EthTransaction[];
};

export type ChainDataParams = {
  json?: ChainDataJson;
  etherscanKey?: string;
  logger?: Logger;
  store?: Store;
};

export interface ChainData {
  getTransaction: (hash: Bytes32, addressBook: AddressBook, parsers?: EthParser[]) => Transaction;
  getTransactions: (addressBook: AddressBook, parsers?: EthParser[]) => TransactionsJson;
  json: ChainDataJson;
  syncAddressBook: (addressBook: AddressBook, key?: string) => Promise<void>;
  syncTransaction: (hash: Bytes32, key?: string) => Promise<void>;
}

export const emptyChainData = {
  addresses: {},
  calls: [],
  transactions: [],
} as ChainDataJson;
