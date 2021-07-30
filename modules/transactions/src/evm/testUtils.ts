import fs from "fs";
import path from "path";

import { AddressZero } from "@ethersproject/constants";
import {
  Address,
  AddressBook,
  AddressCategories,
  Bytes32,
  EvmTransfer,
  Logger,
  Transaction,
} from "@valuemachine/types";
import { getEmptyEvmData, getFileStore } from "@valuemachine/utils";

import { getAddressBook } from "../addressBook";
import { env, testLogger } from "../testUtils";

import { getPolygonData } from "./polygon";
import { getEthereumData } from "./ethereum";

export * from "../testUtils";

export const getTestAddressBook = (selfAddress: Address): AddressBook => 
  getAddressBook({
    json: [{ address: selfAddress, name: "test-self", category: AddressCategories.Self }],
    logger: testLogger,
  });

export const parseEthTx = async ({
  hash,
  selfAddress,
  calls,
  logger,
  storePath,
}: {
  hash: Bytes32;
  selfAddress: Address;
  calls?: EvmTransfer[];
  logger?: Logger;
  storePath?: string;
}): Promise<Transaction> => {
  const addressBook = getTestAddressBook(selfAddress);
  const testStore = getFileStore(path.join(__dirname, storePath || "../testData"), fs);
  const ethData = getEthereumData({
    json: {
      ...getEmptyEvmData(),
      calls: !calls ? [] : calls.map(call => ({
        block: 1,
        from: AddressZero,
        timestamp: "2000-01-01T01:00:00.000Z",
        to: AddressZero,
        value: "0.1",
        ...call,
        hash
      })),
    },
    logger,
    store: testStore,
  });
  await ethData.syncTransaction(hash, env.etherscanKey);
  return ethData.getTransaction(hash, addressBook);
};

export const parsePolygonTx = async ({
  hash,
  selfAddress,
  logger,
  storePath,
}: {
  hash: Bytes32;
  selfAddress: Address;
  logger?: Logger;
  storePath?: string;
}): Promise<Transaction> => {
  const addressBook = getTestAddressBook(selfAddress);
  const testStore = getFileStore(path.join(__dirname, storePath || "../testData"), fs);
  const polygonData = getPolygonData({
    covalentKey: env.covalentKey,
    logger,
    store: testStore,
  });
  await polygonData.syncTransaction(hash);
  return polygonData.getTransaction(hash, addressBook);
};

