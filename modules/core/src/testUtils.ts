import {
  getAddressBook,
} from "@valuemachine/transactions";
import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
  Transaction,
  Transfer,
  TransactionSources,
} from "@valuemachine/types";
import {
  getLogger,
} from "@valuemachine/utils";
import { use } from "chai";
import promised from "chai-as-promised";

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
export const getTestAddressBook = (json: AddressBookJson = []): AddressBook =>
  getAddressBook({
    json: [
      { name: "Self1", category: AddressCategories.Self, address: AddressOne },
      { name: "Self2", category: AddressCategories.Self, address: AddressTwo },
      { name: "NotMe", category: AddressCategories.Private, address: AddressThree },
      { name: "TestToken", category: AddressCategories.ERC20, address: testToken },
      ...json,
    ],
    logger: testLogger,
  });


const timestamp = "2020-01-01T01:00:00Z";
let txIndex = 0;
export const getTx = (transfers: Transfer[]): Transaction => ({
  date: new Date(
    new Date(timestamp).getTime() + (txIndex * 24 * 60 * 60 * 1000)
  ).toISOString(),
  index: txIndex++,
  sources: [TransactionSources.ETH],
  transfers: transfers || [],
});
