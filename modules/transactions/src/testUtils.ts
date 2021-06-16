import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
  Transaction,
} from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";
import { use } from "chai";
import promised from "chai-as-promised";

import { getAddressBook } from "./addressBook";

use(promised);

export { expect } from "chai";

export const env = {
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

export const getTestTx = (tx?: Partial<Transaction>): Transaction => ({
  date: new Date(0).toISOString(),
  sources: [],
  transfers: [],
  ...tx,
});
