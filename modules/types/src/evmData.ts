import { Static, Type } from "@sinclair/typebox";

import { Cryptocurrency } from "./assets";
import { Logger } from "./logger";
import { Store } from "./store";
import { AddressBook } from "./addressBook";
import { EvmParser, Transaction, TransactionsJson } from "./transactions";
import {
  Address,
  Bytes32,
  DecimalString,
  HexString,
  TimestampString,
} from "./strings";

////////////////////////////////////////
// JSON Schema

export const EvmNames = {
  Ethereum: "Ethereum",
  EthereumClassic: "EthereumClassic",
  Polygon: "Polygon",
} as const;
export const EvmName = Type.String(); // allow arbitrary evms in app-level code
export type EvmName = Static<typeof EvmName>;

export const EvmMetadata = Type.Object({
  id: Type.Number(),
  name: EvmName,
  feeAsset: Cryptocurrency,
});

export const EvmTransfer = Type.Object({
  block: Type.Number(),
  from: Address,
  hash: Bytes32,
  timestamp: TimestampString,
  to: Address,
  value: DecimalString,
});
export type EvmTransfer = Static<typeof EvmTransfer>;

export const EvmTransactionLog = Type.Object({
  address: Address,
  data: HexString,
  index: Type.Number(),
  topics: Type.Array(Bytes32),
});
export type EvmTransactionLog = Static<typeof EvmTransactionLog>;

export const EvmTransaction = Type.Object({
  block: Type.Number(),
  data: HexString,
  from: Address,
  gasLimit: HexString, // rm?
  // consolidate into gasFee?
  gasPrice: HexString,
  gasUsed: HexString,
  hash: Bytes32,
  index: Type.Number(),
  logs: Type.Array(EvmTransactionLog),
  nonce: Type.Number(),
  status: Type.Optional(Type.Number()),
  timestamp: TimestampString,
  // transfers: Type.Array(EvmTransfer),
  to: Type.Union([Address, Type.Null()]),
  value: DecimalString,
});
export type EvmTransaction = Static<typeof EvmTransaction>;

export const EvmDataJson = Type.Object({
  addresses: Type.Dict(Type.Object({
    history: Type.Array(Bytes32), /* List of tx hashes that interact with this address */
    lastUpdated: TimestampString,
  })),
  calls: Type.Array(EvmTransfer), // Note: we can have multiple calls per txHash
  transactions: Type.Array(EvmTransaction),
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
  getTransaction: (hash: Bytes32, addressBook: AddressBook, parsers?: EvmParser[]) => Transaction;
  getTransactions: (addressBook: AddressBook, parsers?: EvmParser[]) => TransactionsJson;
  json: EvmDataJson;
  syncAddressBook: (addressBook: AddressBook, key?: string) => Promise<void>;
  syncTransaction: (hash: Bytes32, key?: string) => Promise<void>;
}
