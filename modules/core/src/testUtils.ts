import {
  getAddressBook,
} from "@valuemachine/transactions";
import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
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
export const getTestAddressBook = (json: AddressBookJson = {}): AddressBook =>
  getAddressBook({
    json: {
      [AddressOne]: { name: "Self1", category: AddressCategories.Self, address: AddressOne },
      [AddressTwo]: { name: "Self2", category: AddressCategories.Self, address: AddressTwo },
      [AddressThree]: { name: "NotMe", category: AddressCategories.Private, address: AddressThree },
      [testToken]: { name: "TestToken", category: AddressCategories.ERC20, address: testToken },
      ...json,
    },
    logger: testLogger,
  });
