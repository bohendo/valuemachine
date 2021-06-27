import { AddressZero } from "@ethersproject/constants";
import { AddressCategories, SecurityProviders } from "@valuemachine/types";

import { getAddressBookError } from "./addressBook";
import { expect } from "./testUtils";

describe("AddressBook", () => {

  it("should return no errors json is valid", async () => {
    expect(getAddressBookError([{
      address: AddressZero,
      name: "zero",
      decimals: 0,
      guardian: SecurityProviders.ETH,
      category: AddressCategories.Burn,
    }])).to.be.null;
  });

  it("should return an error if address is invalid", async () => {
    expect(getAddressBookError([{
      address: "invalid",
      name: "zero",
      category: AddressCategories.Burn,
    }])).to.include("address");
  });

  it("should return an error if category is missing", async () => {
    expect(getAddressBookError([{
      address: AddressZero,
      name: "zero",
    }])).to.include("category");
  });

  it("should return an error if name is missing", async () => {
    expect(getAddressBookError([{
      address: AddressZero,
      category: AddressCategories.Burn,
    }])).to.include("name");
  });

});
