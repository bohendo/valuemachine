import fs from "fs";
import path from "path";

import {
  Address,
  AddressBook,
  AddressCategories,
  Bytes32,
  Logger,
  Transaction,
} from "@valuemachine/types";
import { getFileStore } from "@valuemachine/utils";

import { getAddressBook } from "../../addressBook";
import { env, testLogger } from "../../testUtils";
import { getPolygonData } from "../polygon";
import { getEthereumData } from "../ethereum";

export * from "../../testUtils";

export const testStore = getFileStore(path.join(__dirname, "../../testData"), fs);

export const getTestAddressBook = (...selfAddresses: Address[]): AddressBook => 
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
  selfAddress: Address;
  logger?: Logger;
  storePath?: string;
}): Promise<Transaction> => {
  const addressBook = getTestAddressBook(selfAddress);
  const ethData = getEthereumData({
    covalentKey: env.covalentKey,
    etherscanKey: env.etherscanKey,
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
  const polygonData = getPolygonData({
    covalentKey: env.covalentKey,
    etherscanKey: env.etherscanKey,
    logger,
    store: testStore,
  });
  await polygonData.syncTransaction(hash);
  return polygonData.getTransaction(hash, addressBook);
};

