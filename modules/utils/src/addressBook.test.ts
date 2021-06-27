import { AddressZero } from "@ethersproject/constants";
import { AddressCategories } from "@valuemachine/types";

import { getAddressBookError } from "./addressBook";
import { expect } from "./testUtils";

describe("AddressBook", () => {

  it("should accept valid json", async () => {
    expect(getAddressBookError([{
      address: AddressZero,
      name: "zero",
      category: AddressCategories.Burn,
    }])).to.be.null;
  });

  it("should reject invalid json", async () => {
    expect(getAddressBookError([{
      address: "invalid",
      name: "zero",
      category: AddressCategories.Burn,
    }])).to.be.a("string");
  });

});
