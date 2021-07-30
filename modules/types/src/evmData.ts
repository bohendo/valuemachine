import { Static, Type } from "@sinclair/typebox";

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

////////////////////////////////////////
// JSON Schema

export const EthCall = Type.Object({
  block: Type.Number(),
  from: Address,
  hash: Bytes32,
  timestamp: TimestampString,
  to: Address,
  value: DecimalString,
});
export type EthCall = Static<typeof EthCall>;

export const EthTransactionLog = Type.Object({
  address: Address,
  data: HexString,
  index: Type.Number(),
  topics: Type.Array(Bytes32),
});
export type EthTransactionLog = Static<typeof EthTransactionLog>;

export const EthTransaction = Type.Object({
  block: Type.Number(),
  data: HexString,
  from: Address,
  gasLimit: HexString,
  gasPrice: HexString,
  gasUsed: HexString,
  hash: Bytes32,
  index: Type.Number(),
  logs: Type.Array(EthTransactionLog),
  nonce: Type.Number(),
  status: Type.Optional(Type.Number()),
  timestamp: TimestampString,
  to: Type.Union([Address, Type.Null()]),
  value: DecimalString,
});
export type EthTransaction = Static<typeof EthTransaction>;

export const EvmDataJson = Type.Object({
  addresses: Type.Dict(Type.Object({
    history: Type.Array(Bytes32), /* List of tx hashes that interact with this address */
    lastUpdated: TimestampString,
  })),
  calls: Type.Array(EthCall), // Note: we can have multiple calls per txHash
  transactions: Type.Array(EthTransaction),
});
export type EvmDataJson = Static<typeof EvmDataJson>;

////////////////////////////////////////
// Function Interfaces

export type EvmDataParams = {
  json?: EvmDataJson;
  etherscanKey?: string;
  logger?: Logger;
  store?: Store;
};

export interface EvmData {
  getTransaction: (hash: Bytes32, addressBook: AddressBook, parsers?: EthParser[]) => Transaction;
  getTransactions: (addressBook: AddressBook, parsers?: EthParser[]) => TransactionsJson;
  json: EvmDataJson;
  syncAddressBook: (addressBook: AddressBook, key?: string) => Promise<void>;
  syncTransaction: (hash: Bytes32, key?: string) => Promise<void>;
}
