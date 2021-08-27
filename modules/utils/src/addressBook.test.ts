import { getAddress } from "@ethersproject/address";
import { AddressZero } from "@ethersproject/constants";
import { AddressCategories, Guards } from "@valuemachine/types";

import { getAddressBookError, fmtAddressBook } from "./addressBook";
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

  it("should return no errors if json is valid", async () => {
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

  it("should format addresses properly", async () => {
    const lowercase = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const checksummed = getAddress(lowercase);
    const clean = fmtAddressBook({
      [lowercase]: {
        address: lowercase,
        name: "bohendo.eth",
        category: AddressCategories.Self,
      },
    });
    expect(lowercase).to.not.equal(checksummed);
    expect(Object.keys(clean)).to.include(checksummed);
    expect(clean[checksummed].address).to.equal(checksummed);
    expect(clean[lowercase]?.address).to.be.undefined;
  });

});
