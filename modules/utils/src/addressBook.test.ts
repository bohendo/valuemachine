import { AddressZero } from "@ethersproject/constants";
import { AddressCategories, Guards } from "@valuemachine/types";

import { getAddressBookError } from "./addressBook";
import { getLogger } from "./logger";
import { expect } from "./testUtils";

const address = AddressZero;
const validAddressBookEntry = {
  address,
  name: "zero",
  decimals: 0,
  guard: Guards.Ethereum,
  category: AddressCategories.Burn,
};

describe("AddressBook", () => {

  it.only("should return no errors if json is valid", async () => {
    const log = getLogger("info").child({ module: "TestAddressBook" });
    log.info(validAddressBookEntry, "checking to see whether a valid address book produces errors");
    expect(getAddressBookError({ [address]: validAddressBookEntry })).to.be.null;
  });

  it("should return an error if category is invalid", async () => {
    expect(getAddressBookError({ [address]: {
      ...validAddressBookEntry,
      category: null,
    } }) || "").to.include("category");
  });

  it("should return an error if name is missing", async () => {
    expect(getAddressBookError({ [address]: {
      ...validAddressBookEntry,
      name: undefined,
    } }) || "").to.include("name");
  });

});
