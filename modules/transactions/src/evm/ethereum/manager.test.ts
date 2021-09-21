import {
  env,
  expect,
  getTestAddressBook,
  testLogger,
} from "../testUtils";

import { getEthereumData } from "./manager";

const logger = testLogger.child({ module: "TestEthereumData" }, { level: "trace" });

// Skip tests that require network calls unless we're actively debugging
describe.skip("Ethereum Data Manager", () => {

  it("should fetch the same data from alchemy & etherscan", async () => {
    const addressBook = getTestAddressBook("Ethereum/0xDD8251bB8e7Ba07DfcD9e1842CD9E3cDfc0399C8");
    const etherscan = getEthereumData({ etherscanKey: env.etherscanKey, logger });
    await etherscan.syncAddressBook(addressBook);
    const etherscanRes = etherscan.getTransactions(addressBook);
    const alchemy = getEthereumData({ alchemyProvider: env.alchemyProvider, logger });
    await alchemy.syncAddressBook(addressBook);
    const alchemyRes = alchemy.getTransactions(addressBook);
    expect(etherscanRes).to.deep.equal(alchemyRes);
  });

  it("should sync & parse an address w zero transactions", async () => {
    const addressBook = getTestAddressBook("Ethereum/0xe126385dbf1016c957367e1779d7d99bf7abd58c");
    const alchemy = getEthereumData({ alchemyProvider: env.alchemyProvider, logger });
    await alchemy.syncAddressBook(addressBook);
    const alchemyRes = alchemy.getTransactions(addressBook);
    logger.info(alchemyRes, "transactions from alchemy");
    const etherscan = getEthereumData({ etherscanKey: env.etherscanKey, logger });
    await etherscan.syncAddressBook(addressBook);
    const etherscanRes = etherscan.getTransactions(addressBook);
    logger.info(etherscanRes, "transactions from etherscan");
    expect(etherscanRes).to.deep.equal(alchemyRes);
  });

});

