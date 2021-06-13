import { AddressZero, HashZero } from "@ethersproject/constants";
import {
  EthCall,
  EthTransaction,
} from "@valuemachine/types";
import { use } from "chai";
import promised from "chai-as-promised";

import { getLogger } from "./utils";

use(promised);

export { expect } from "chai";

const env = {
  logLevel: process.env.LOG_LEVEL || "error",
  etherscanKey: process.env.ETHERSCAN_KEY || "",
};

export const testLogger = getLogger(env.logLevel).child({ module: "TestUtils" });
testLogger.info(env, `Starting tests in env`);

export const AddressOne = "0x1111111111111111111111111111111111111111";
export const AddressTwo = "0x2222222222222222222222222222222222222222";
export const AddressThree = "0x3333333333333333333333333333333333333333";
export const testToken = "0x9999999999999999999999999999999999999999";

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
