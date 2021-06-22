import fs from "fs";
import path from "path";

import { AddressZero, HashZero } from "@ethersproject/constants";
import {
  Address,
  AddressCategories,
  Bytes32,
  ChainData,
  emptyChainData,
  EthCall,
  EthTransaction,
  Logger,
  Transaction,
} from "@valuemachine/types";
import { getFileStore } from "@valuemachine/utils";

import { getAddressBook } from "../addressBook";
import { env, testLogger } from "../testUtils";

import { getChainData } from "./chainData";

export * from "../testUtils";

const testData = "./testData";

export const parseEthTx = async ({
  hash,
  selfAddress,
  calls,
  logger,
  storePath,
}: {
  hash: Bytes32;
  selfAddress: Address;
  calls?: EthCall[];
  logger?: Logger;
  storePath: string;
}): Promise<Transaction> => {
  const addressBook = getAddressBook({
    json: [{ address: selfAddress, name: "test-self", category: AddressCategories.Self }],
    logger: testLogger,
  });
  const testStore = getFileStore(path.join(__dirname, storePath || testData), fs);
  const chainData = getChainData({
    json: {
      ...emptyChainData,
      calls: !calls ? [] : calls.map(call => getTestEthCall({ ...call, hash })),
    },
    logger,
    store: testStore,
  });
  await chainData.syncTransaction(hash, env.etherscanKey);
  return chainData.getTransaction(hash, addressBook);
};

export const getTestChainData = (
  transactions = [] as EthTransaction[],
  calls = [] as EthCall[],
): ChainData => getChainData({
  logger: testLogger,
  json: {
    ...emptyChainData,
    calls,
    transactions,
  },
});

// TODO: remove this fn
export const getEthTx = async (
  txHash: Bytes32,
  dirpath = testData,
): Promise<EthTransaction> => {
  const testStore = getFileStore(path.join(__dirname, dirpath), fs);
  const chainData = getChainData({ logger: testLogger, store: testStore });
  await chainData.syncTransaction(txHash, env.etherscanKey);
  return chainData.getTransaction(txHash, getAddressBook()) as any;
};

export const getTestEthTx = (ethTx?: Partial<EthTransaction>): EthTransaction => ({
  block: 1,
  data: "0x",
  from: AddressZero,
  gasLimit: "0x100000",
  gasPrice: "0x100000",
  gasUsed: "0x1000",
  hash: HashZero,
  index: 1,
  logs: [],
  nonce: 0,
  status: 1,
  timestamp: "2000-01-01T00:00:00.000Z",
  to: AddressZero,
  value: "0",
  ...ethTx,
});

export const getTestEthCall = (ethCall?: Partial<EthCall>): EthCall => ({
  block: 1,
  from: AddressZero,
  hash: HashZero,
  timestamp: "2000-01-01T01:00:00.000Z",
  to: AddressZero,
  value: "0.1",
  ...ethCall,
});
