import { getAddress } from "@ethersproject/address";
import { AddressZero } from "@ethersproject/constants";
import { AddressCategories, Guards } from "@valuemachine/types";

import { getAddressBookError, fmtAddressBook } from "./addressBook";
import { getLogger } from "./logger";
import { expect } from "./testUtils";

const log = getLogger("warn").child({ module: "TestAddressBookUtils" });
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
    expect(lowercase).to.not.equal(checksummed);
    const clean = fmtAddressBook({
      [lowercase]: {
        address: lowercase,
        name: "bohendo.eth",
        category: AddressCategories.Self,
      },
    });
    expect(Object.keys(clean)).to.include(checksummed);
    expect(clean[checksummed].address).to.equal(checksummed);
    expect(clean[lowercase]?.address).to.be.undefined;
  });

  it("should prefer checksummed entries while discarding duplicates", async () => {
    const lowercase = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const checksummed = getAddress(lowercase);
    const raw = {
      [checksummed]: {
        address: checksummed,
        name: "PrettyGood",
        category: AddressCategories.Self,
      },
      [lowercase]: {
        address: lowercase,
        name: "NotGreat",
        category: AddressCategories.Self,
      },
    };
    const clean = fmtAddressBook(raw);
    log.info(raw, "raw");
    log.info(clean, "clean");
    expect(Object.keys(clean)).to.include(checksummed);
    expect(Object.keys(clean)).to.not.include(lowercase);
    expect(clean[checksummed].address).to.equal(checksummed);
    expect(clean[checksummed].name).to.equal("PrettyGood");
    expect(clean[lowercase]).to.be.undefined;
  });

});
