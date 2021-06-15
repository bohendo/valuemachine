import {
  AddressBook,
  ChainData,
  EthTransaction,
  Logger,
  Transaction,
} from "@valuemachine/types";

export type EthParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
) => Transaction;

export type CsvParser = (
  txns: Transaction[],
  csvData: string,
  logger: Logger,
) => Transaction;
