import fs from "fs";
import path from "path";

import { AddressZero, HashZero } from "@ethersproject/constants";
import {
  AddressCategories,
  ChainData,
  EthCall,
  EthTransaction,
  Store,
  StoreKeys,
} from "@finances/types";
import { getLogger } from "@finances/utils";

import { getAddressBook } from "../addressBook";
import { getChainData } from "../chainData";

const env = {
  logLevel: process.env.LOG_LEVEL || "silent",
  etherscanKey: process.env.ETHERSCAN_KEY || "",
};

export const testLogger = getLogger(env.logLevel).child({ module: "TestUtils" });
testLogger.info(env, `Starting tests in env`);

export const AddressOne = "0x0000000000000000000000000000000000000001";
export const AddressTwo = "0x0000000000000000000000000000000000000002";
export const testToken = "0x0000000000000000000000000000000000000003";

export const testAddressBook = getAddressBook(
  [
    { name: "test-self-1", category: AddressCategories.Self, address: AddressOne },
    { name: "test-self-2", category: AddressCategories.Self, address: AddressTwo },
    { name: "test-token", category: AddressCategories.ERC20, address: testToken },
  ],
  testLogger,
);

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

export const getTestChainData = (
  transactions = [getTestEthTx()] as EthTransaction[],
  calls = [] as EthCall[],
): ChainData => getChainData({
  logger: testLogger,
  chainDataJson: {
    addresses: {
      [AddressOne]: {
        history: [HashZero],
        lastUpdated: new Date(0).toISOString(),
      }
    },
    calls,
    tokens: {},
    transactions,
  },
});

export const getRealChainData = async (txHash: string): Promise<ChainData> => {
  const filepath = path.join(__dirname, "./testChainData.json");
  const testStore = {
    load: (key: StoreKeys): any => {
      if (key === StoreKeys.ChainData) {
        return JSON.parse(fs.readFileSync(filepath, "utf8"));
      } else {
        throw new Error(`Test store has not implemented key ${key}`);
      }
    },
    save: (key: StoreKeys, data: any): void => {
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
