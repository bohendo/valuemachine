import { Account } from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";

import { AddressCategories } from "./enums";
import { getAddressBook } from "./addressBook";
import { fmtAddress } from "./utils";
import { AddressBook } from "./types";

export const env = {
  logLevel: process.env.LOG_LEVEL || "error",
  alchemyProvider: process.env.ALCHEMY_PROVIDER || "",
  covalentKey: process.env.COVALENT_KEY || "",
  etherscanKey: process.env.ETHERSCAN_KEY || "",
  polygonscanKey: process.env.POLYGONSCAN_KEY || "",
};

export const testLogger = getLogger(env.logLevel || "warn").child({ name: "TestUtils" });

testLogger.info(env, "starting tx tests in env");

export const getTestAddressBook = (...selfAddresses: Account[]): AddressBook =>
  getAddressBook({
    json: selfAddresses.reduce((addressBookJson, rawAddress, i) => {
      const address = fmtAddress(rawAddress);
      addressBookJson[address] = {
        address,
        name: `Self${i}`,
        category: AddressCategories.Self,
      };
      return addressBookJson;
    }, {}),
    logger: getLogger("warn"),
  });
