import fs from "fs";
import path from "path";

import {
  Account,
  TxId,
  AddressBook,
  AddressCategories,
  Logger,
  Transaction,
} from "@valuemachine/types";
import { getFileStore } from "@valuemachine/utils";

import { getAddressBook } from "../addressBook";
import { env, testLogger } from "../testUtils";

import { getPolygonData } from "./polygon";
import { getEthereumData } from "./ethereum";

export * from "../testUtils";

export const getTestAddressBook = (...selfAddresses: Account[]): AddressBook => 
  getAddressBook({
    json: selfAddresses.reduce((addressBookJson, address, i) => {
      addressBookJson[address] = {
        address,
        name: `Self${i}`,
        category: AddressCategories.Self,
      };
      return addressBookJson;
    }, {}),
    logger: testLogger,
  });

export const getParseTx = (params?: {
  addressBook?: AddressBook;
  logger?: Logger;
  storePath?: string;
}) => {
  const logger = params?.logger || testLogger;
  const storePath = params?.storePath || path.join(__dirname, "../testData");
  const store = getFileStore(storePath, fs);
  const polyData = getPolygonData({ polygonscanKey: env.polygonscanKey, logger, store });
  const ethData = getEthereumData({ etherscanKey: env.etherscanKey, logger, store });
  return async ({
    txid,
    selfAddress,
  }: {
    txid: TxId;
    selfAddress?: Account;
  }): Promise<Transaction> => {
    const addressBook = params?.addressBook || getTestAddressBook(selfAddress);
    const [evm, hash] = txid.split("/");
    if (evm === "Ethereum") {
      await ethData.syncTransaction(hash);
      return ethData.getTransaction(hash, addressBook);
    } else if (evm === "Polygon") {
      await polyData.syncTransaction(hash);
      return polyData.getTransaction(hash, addressBook);
    } else {
      throw new Error(`Idk what to do w this tx: ${txid}`);
    }
  };
};

