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

  it("should return an abbreviated default name for eth2 pubkeys", async () => {
    const addressBook = getAddressBook({ logger: log });
    const address = "Ethereum/ETH2/0x8311d8885c246725e3c1ae348e67513fcd8b6ad40fd449481ffa5234ba3f995a84a82851d0a58b7d7caa60cdb9354707";
    const name = addressBook.getName(address, true);
    log.info(`${address} is also known as ${name}`);
    expect(name).to.be.a("string");
    expect(name).to.include("..");
  });

});

