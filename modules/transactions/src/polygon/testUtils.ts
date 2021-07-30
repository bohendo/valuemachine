import fs from "fs";
import path from "path";

import {
  Address,
  AddressCategories,
  Bytes32,
  Logger,
  Transaction,
} from "@valuemachine/types";
import { getFileStore } from "@valuemachine/utils";

import { env } from "../testUtils";
import { getAddressBook } from "../addressBook";

import { getPolygonData } from "./polygonData";

export * from "../testUtils";

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
  const addressBook = getAddressBook({
    json: [{ address: selfAddress, name: "test-self", category: AddressCategories.Self }],
    logger,
  });
  const testStore = getFileStore(path.join(__dirname, storePath || "../testData"), fs);
  const polygonData = getPolygonData({
    covalentKey: env.covalentKey,
    logger,
    store: testStore,
  });
  await polygonData.syncTransaction(hash);
  return polygonData.getTransaction(hash, addressBook);
};
