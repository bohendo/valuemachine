import { Account } from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";
import { use } from "chai";
import promised from "chai-as-promised";

import { AddressCategories } from "./enums";
import { getAddressBook } from "./addressBook";
import { AddressBook } from "./types";

use(promised);

export { expect } from "chai";

export const env = {
  logLevel: process.env.LOG_LEVEL || "error",

  alchemyProvider: process.env.ALCHEMY_PROVIDER || "",
  covalentKey: process.env.COVALENT_KEY || "",
  etherscanKey: process.env.ETHERSCAN_KEY || "",
  polygonscanKey: process.env.POLYGONSCAN_KEY || "",
};

export const testLogger = getLogger(env.logLevel).child({ module: "TestUtils" });

testLogger.info(env, "starting tx tests in env");

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
