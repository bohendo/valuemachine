import { getAddressBook } from "./addressBook";
import {
  expect,
  testLogger,
} from "./testUtils";

const log = testLogger.child({ module: "TestAddressBook" }, { level: "warn" });

const getAddress = (val: string): string => `0x${val.repeat(40).substring(0, 40)}`;

describe("AddressBook", () => {

  it("should return an abbreviated default name for evm addresses", async () => {
    const addressBook = getAddressBook({ logger: log });
    const address = getAddress("1");
    const name = addressBook.getName(address);
    log.info(`${address} is also known as ${name}`);
    expect(name).to.be.a("string");
    expect(name).to.include("..");
  });

  it("should return an abbreviated default name for vm accounts", async () => {
    const addressBook = getAddressBook({ logger: log });
    const account = `Ethereum/${getAddress("1")}`;
    const name = addressBook.getName(account);
    log.info(`${account} is also known as ${name}`);
    expect(name).to.be.a("string");
    expect(name).to.include("..");
  });

});

