import { AddressZero } from "@ethersproject/constants";
import { AddressCategories, SecurityProviders } from "@valuemachine/types";

import { getAddressBookError } from "./addressBook";
import { expect } from "./testUtils";

const validAddressBookEntry = {
  address: AddressZero,
  name: "zero",
  decimals: 0,
  guardian: SecurityProviders.ETH,
  category: AddressCategories.Burn,
};

describe("AddressBook", () => {

  it("should return no errors if json is valid", async () => {
    expect(getAddressBookError([validAddressBookEntry])).to.be.null;
  });

  it("should return an error if address is invalid", async () => {
    expect(getAddressBookError([{
      ...validAddressBookEntry,
      address: "bad",
    }])).to.include("address");
  });

  it("should return an error if category is invalid", async () => {
    expect(getAddressBookError([{
      ...validAddressBookEntry,
      category: null,
    }])).to.include("category");
  });

  it("should return an error if name is missing", async () => {
    expect(getAddressBookError([{
      ...validAddressBookEntry,
      name: undefined,
    }])).to.include("name");
  });

});
