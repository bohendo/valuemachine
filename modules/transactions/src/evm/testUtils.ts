import fs from "fs";
import path from "path";

import {
  Account,
  TxId,
  AddressBook,
  Logger,
  Transaction,
} from "@valuemachine/types";
import { getFileStore, getTransactionError } from "@valuemachine/utils";

import { env, getTestAddressBook, testLogger } from "../testUtils";

import { getPolygonData } from "./polygon";
import { getEthereumData } from "./ethereum";

export * from "../testUtils";

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
    let tx;
    if (evm === "Ethereum") {
      await ethData.syncTransaction(hash);
      tx = ethData.getTransaction(hash, addressBook);
    } else if (evm === "Polygon") {
      await polyData.syncTransaction(hash);
      tx = polyData.getTransaction(hash, addressBook);
    } else {
      throw new Error(`Idk what to do w this tx: ${txid}`);
    }
    const error = getTransactionError(tx);
    if (error) throw new Error(error);
    return tx;
  };
};

