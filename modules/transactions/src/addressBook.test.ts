import { AddressZero } from "@ethersproject/constants";

import { getAddressBook } from "./addressBook";
import {
  expect,
  testLogger,
} from "./testUtils";

const log = testLogger.child({ module: "TestAddressBook",
  // level: "debug",
});

describe("AddressBook", () => {

  it("should return a valid guard", async () => {
    const addressBook = getAddressBook();
    const address = AddressZero.replace("000", "001");
    const guard = addressBook.getGuard(address);
    log.info(`${address} is guarded by ${guard}`);
    expect(guard).to.be.ok;
  });

});

