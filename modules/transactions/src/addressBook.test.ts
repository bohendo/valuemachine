import { AddressZero } from "@ethersproject/constants";

import { getAddressBook } from "./addressBook";
import {
  expect,
  testLogger,
} from "./testUtils";

const log = testLogger.child({ module: "TestAddressBook" }, {
  // level: "debug",
});

describe("AddressBook", () => {

  it("should return a valid name", async () => {
    const addressBook = getAddressBook({ logger: log });
    const address = AddressZero.replace("000", "001");
    const name = addressBook.getName(address);
    log.info(`${address} is also known as ${name}`);
    expect(name).to.be.a("string");
  });

});

