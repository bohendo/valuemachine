import fs from "fs";
import path from "path";

import {
  Account,
  AddressBook,
  AddressCategories,
  Bytes32,
  Logger,
  Transaction,
} from "@valuemachine/types";
import { getFileStore } from "@valuemachine/utils";

import { getAddressBook } from "../addressBook";
import { env, testLogger } from "../testUtils";

import { getPolygonData } from "./polygon";
import { getEthereumData } from "./ethereum";

export * from "../testUtils";

export const testStore = getFileStore(path.join(__dirname, "../testData"), fs);

export const getTestAddressBook = (...selfAddresses: Account[]): AddressBook => 
  getAddressBook({
    json: selfAddresses.reduce((addressBookJson, address, i) => {
      addressBookJson[address] = {
        address,
        name: `test-self-${i}`,
        category: AddressCategories.Self,
      };
      return addressBookJson;
    }, {}),
    logger: testLogger,
  });

export const parseEthTx = async ({
  hash,
  selfAddress,
  logger,
  storePath,
}: {
  hash: Bytes32;
  selfAddress: Account;
  logger?: Logger;
  storePath?: string;
}): Promise<Transaction> => {
  const addressBook = getTestAddressBook(selfAddress);
  const store = getFileStore(path.join(__dirname, storePath || "../testData"), fs);
  const ethData = getEthereumData({
    alchemyProvider: env.alchemyProvider,
    logger,
    store,
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
  selfAddress: Account;
  logger?: Logger;
  storePath?: string;
}): Promise<Transaction> => {
  const addressBook = getTestAddressBook(selfAddress);
  const store = getFileStore(path.join(__dirname, storePath || "../testData"), fs);
  const polygonData = getPolygonData({
    apiKey: env.covalentKey,
    logger,
    store,
  });
  await polygonData.syncTransaction(hash);
  return polygonData.getTransaction(hash, addressBook);
};

