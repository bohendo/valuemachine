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

import { env, testLogger } from "../testUtils";
import { getAddressBook } from "../addressBook";

import { getPolygonData } from "./polygonData";

export * from "../testUtils";

export const getTestAddressBook = (selfAddress: Address): AddressBook => 
  getAddressBook({
    json: [{ address: selfAddress, name: "test-self", category: AddressCategories.Self }],
    logger: testLogger,
  });

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
  const testStore = getFileStore(path.join(__dirname, storePath || "../testData"), fs);
  const addressBook = getTestAddressBook(selfAddress);
  const polygonData = getPolygonData({
    covalentKey: env.covalentKey,
    logger,
    store: testStore,
  });
  await polygonData.syncTransaction(hash);
  return polygonData.getTransaction(hash, addressBook);
};
