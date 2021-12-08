import fs from "fs";
import path from "path";

import { Account, TxId, Logger } from "@valuemachine/types";

import { env, getTestAddressBook, testLogger } from "../testUtils";
import { AddressBook, Transaction } from "../types";
import { getTransactionError } from "../utils";

import { getPolygonData } from "./polygon";
import { getEthereumData } from "./ethereum";

export * from "../testUtils";

export type Store = {
  save: (key: string, val: any) => void;
  load: (key: string) => any;
};

const getFileStore = (dirpath: string): Store => {
  const getFilePath = (key: string): string => `${
    dirpath.endsWith("/") ? dirpath.replace(/\/$/, "") : dirpath
  }/${
    key.replace(/[A-Z]/g, "-$&").replace(/^-/, "").toLowerCase()
  }.json`;
  return {
    load: (key: string): any => {
      try {
        return JSON.parse(fs.readFileSync(getFilePath(key), "utf8"));
      } catch (e) {
        return undefined;
      }
    },
    save: (key: string, data: any): void => {
      if (!data) return;
      fs.writeFileSync(getFilePath(key), JSON.stringify(data, null, 2));
    },
  };
};

export const getParseTx = (params?: {
  addressBook?: AddressBook;
  logger?: Logger;
  storePath?: string;
}) => {
  const logger = params?.logger || testLogger;
  const storePath = params?.storePath || path.join(__dirname, "../testData");
  const store = getFileStore(storePath);
  const polyData = getPolygonData({
    json: store.load("PolygonData"),
    logger,
    polygonscanKey: env.polygonscanKey,
    save: val => store.save("PolygonData", val),
  });
  const ethData = getEthereumData({
    etherscanKey: env.etherscanKey,
    json: store.load("EthereumData"),
    logger,
    save: val => store.save("EthereumData", val),
  });
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

