import { Static, Type } from "@sinclair/typebox";
import {
  Account,
  Bytes32,
  DateTimeString,
  DecString,
  Guard,
  HexString,
  IntString,
  Logger,
} from "@valuemachine/types";

import { AddressBook, TransactionsJson, Transaction } from "../types";

////////////////////////////////////////
// JSON Schema

export const EvmAddress = Type.RegEx(new RegExp(`^0x[0-9a-fA-F]{40}$`));
export type EvmAddress = Static<typeof EvmAddress>;

export const EvmMetadata = Type.Object({
  id: Type.Number(), // value returned from chainId opcode
  name: Guard, // common name
  feeAsset: Type.String(), // native token used to pay security fees
});
export type EvmMetadata = Static<typeof EvmMetadata>;

export const EvmTransfer = Type.Object({
  from: Account,
  to: Type.Union([Account, Type.Null()]),
  value: DecString,
});
export type EvmTransfer = Static<typeof EvmTransfer>;

export const EvmTransactionLog = Type.Object({
  address: Account,
  data: HexString,
  index: Type.Number(),
  topics: Type.Array(Bytes32),
});
export type EvmTransactionLog = Static<typeof EvmTransactionLog>;

export const EvmTransaction = Type.Object({
  from: Account,
  gasPrice: IntString,
  gasUsed: IntString,
  hash: Bytes32,
  logs: Type.Array(EvmTransactionLog),
  nonce: Type.Number(),
  status: Type.Optional(Type.Number()),
  timestamp: DateTimeString,
  transfers: Type.Array(EvmTransfer),
  to: Type.Union([Account, Type.Null()]),
  value: DecString,
});
export type EvmTransaction = Static<typeof EvmTransaction>;

export const EvmDataJson = Type.Object({
  addresses: Type.Record(Type.String(), Type.Object({
    history: Type.Array(Bytes32), /* List of tx hashes that interact with this address */
    lastUpdated: DateTimeString,
  })),
  transactions: Type.Record(Type.String(), EvmTransaction),
});
export type EvmDataJson = Static<typeof EvmDataJson>;

////////////////////////////////////////
// Function Interfaces

export type EvmFetcher = {
  fetchHistory: (address: EvmAddress) => Promise<Bytes32[]>;
  fetchTransaction: (txHash: Bytes32) => Promise<EvmTransaction>;
};

export type EvmParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
) => Transaction;

export type EvmParsers = {
  insert: EvmParser[];
  modify: EvmParser[];
};

export type EvmDataParams = {
  apiKey?: string;
  providerUrl?: string;
  json?: EvmDataJson;
  logger?: Logger;
  save?: (val: EvmDataJson) => void;
};

export interface EvmData {
  getTransaction: (hash: Bytes32, addressBook: AddressBook, parsers?: EvmParsers) => Transaction;
  getTransactions: (addressBook: AddressBook, parsers?: EvmParsers) => TransactionsJson;
  json: EvmDataJson;
  syncAddressBook: (addressBook: AddressBook, key?: string) => Promise<void>;
  syncTransaction: (hash: Bytes32, key?: string) => Promise<void>;
}
