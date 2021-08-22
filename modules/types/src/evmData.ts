import { Static, Type } from "@sinclair/typebox";

import { DigitalGuard } from "./guards";
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

export const EvmMetadata = Type.Object({
  id: Type.Number(), // value returned from chainId opcode
  name: DigitalGuard, // common name
  feeAsset: Type.String(), // native token used to pay security fees
});
export type EvmMetadata = Static<typeof EvmMetadata>;

export const EvmTransfer = Type.Object({
  from: Address,
  to: Type.Union([Address, Type.Null()]),
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
  from: Address,
  gasPrice: HexString,
  gasUsed: HexString,
  hash: Bytes32,
  logs: Type.Array(EvmTransactionLog),
  nonce: Type.Number(),
  status: Type.Optional(Type.Number()),
  timestamp: TimestampString,
  transfers: Type.Array(EvmTransfer),
  to: Type.Union([Address, Type.Null()]),
  value: DecimalString,
});
export type EvmTransaction = Static<typeof EvmTransaction>;

export const EvmDataJson = Type.Object({
  addresses: Type.Record(Type.String(), Type.Object({
    history: Type.Array(Bytes32), /* List of tx hashes that interact with this address */
    lastUpdated: TimestampString,
  })),
  transactions: Type.Record(Type.String(), EvmTransaction),
});
export type EvmDataJson = Static<typeof EvmDataJson>;

////////////////////////////////////////
// Function Interfaces

export type EvmDataParams = {
  covalentKey?: string;
  etherscanKey?: string;
  json?: EvmDataJson;
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
