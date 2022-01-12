import { getAddress } from "@ethersproject/address";
import { AddressZero } from "@ethersproject/constants";
import { expect } from "chai";

import { getAddressBook } from "./addressBook";
import { AddressCategories } from "./enums";
import { testLogger } from "./testUtils";
import { getAddressBookError, fmtAddressBook } from "./utils";

const log = testLogger.child({ name: "TestAddressBook" }, { level: "warn" });

const makeAddress = (val: string): string => `0x${val.repeat(40).substring(0, 40)}`;

const address = AddressZero;
const validAddressBookEntry = {
  address,
  name: "zero",
  decimals: 0,
  category: AddressCategories.Burn,
};

describe("AddressBook", () => {

  it("should return an abbreviated default name for evm addresses", async () => {
    const addressBook = getAddressBook({ logger: log });
    const address = makeAddress("1");
    const name = addressBook.getName(address);
    log.info(`${address} is also known as ${name}`);
    expect(name).to.be.a("string");
    expect(name).to.include("..");
  });

  it("should return an abbreviated default name for vm accounts", async () => {
    const addressBook = getAddressBook({ logger: log });
    const account = `Ethereum/${makeAddress("1")}`;
    const name = addressBook.getName(account);
    log.info(`${account} is also known as ${name}`);
    expect(name).to.be.a("string");
    expect(name).to.include("..");
  });

  it("should return an abbreviated default name for eth2 pubkeys", async () => {
    const addressBook = getAddressBook({ logger: log });
    const address = "Ethereum/ETH2/0x8311d8885c246725e3c1ae348e67513fcd8b6ad40fd449481ffa5234ba3f995a84a82851d0a58b7d7caa60cdb9354707";
    const name = addressBook.getName(address, true);
    log.info(`${address} is also known as ${name}`);
    expect(name).to.be.a("string");
    expect(name).to.include("..");
  });

  it("should return no errors if json is valid", async () => {
    expect(getAddressBookError({ [address]: validAddressBookEntry })).to.equal("");
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
