import fs from "fs";
import path from "path";

import { AddressZero, HashZero } from "@ethersproject/constants";
import {
  Bytes32,
  ChainData,
  EthCall,
  EthTransaction,
  Store,
  StoreKey,
  StoreKeys,
} from "@valuemachine/types";

import { AddressOne, env, testLogger } from "../testUtils";

import { getChainData } from "./chainData";

export * from "../testUtils";

export const getTestChainData = (
  transactions = [] as EthTransaction[],
  calls = [] as EthCall[],
): ChainData => getChainData({
  logger: testLogger,
  chainDataJson: {
    addresses: {},
    calls,
    tokens: {},
    transactions,
  },
});

export const getRealChainData = async (
  txHash: Bytes32,
  _filepath = "./testChainData.json",
): Promise<ChainData> => {
  const filepath = path.join(__dirname, _filepath);
  const testStore = {
    load: (key: StoreKey): any => {
      if (key === StoreKeys.ChainData) {
        return JSON.parse(fs.readFileSync(filepath, "utf8"));
      } else {
        throw new Error(`Test store has not implemented key ${key}`);
      }
    },
    save: (key: StoreKey, data: any): void => {
      if (key === StoreKeys.ChainData) {
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      } else {
        throw new Error(`Test store has not implemented key ${key}`);
      }
    },
  } as Store;
  const chainData = getChainData({
    logger: testLogger,
    store: testStore,
  });
  await chainData.syncTransaction({ hash: txHash }, env.etherscanKey);
  return getTestChainData([chainData.getEthTransaction(txHash)]);
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
  contractAddress: AddressZero,
  from: AddressZero,
  hash: HashZero,
  timestamp: "2000-01-01T01:00:00.000Z",
  to: AddressZero,
  value: "0.1",
  ...ethCall,
});
