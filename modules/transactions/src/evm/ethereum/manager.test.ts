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
    const etherscan = getEthereumData({
      etherscanKey: env.etherscanKey,
      logger,
    });
    await etherscan.syncAddressBook(addressBook);
    const etherscanRes = etherscan.getTransactions(addressBook);
    const alchemy = getEthereumData({
      alchemyProvider: env.alchemyProvider,
      logger,
    });
    await alchemy.syncAddressBook(addressBook);
    const alchemyRes = alchemy.getTransactions(addressBook);
    expect(etherscanRes).to.deep.equal(alchemyRes);
  });

});

