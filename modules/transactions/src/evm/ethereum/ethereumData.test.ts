import { ChainData, Guards } from "@valuemachine/types";
import { getTransactionsError } from "@valuemachine/utils";

import {
  env,
  expect,
  getTestAddressBook,
  // testStore,
  testLogger,
} from "../testUtils";

import { getEthereumData } from "./ethereumData";

const logger = testLogger.child({ module: `TestEthereum`,
  level: "info",
});

describe.only("Ethereum Data", () => {
  let ethData: ChainData;
  beforeEach(() => {
    ethData = getEthereumData({
      covalentKey: env.covalentKey,
      etherscanKey: env.etherscanKey,
      // store: testStore,
      logger,
    });
  });

  it("should create a eth data manager", async () => {
    expect(ethData).to.be.ok;
  });

  it("should sync & parse a transaction", async () => {
    const addressBook = getTestAddressBook("evm:1:0x1057bea69c9add11c6e3de296866aff98366cfe3");
    const hash = "0x9f7342f3f37a9fa74857afd9c56e4a290af983758df8a937dcd78e2588ba6c4e";
    await ethData.syncTransaction(hash, env.etherscanKey);
    const tx = ethData.getTransaction(hash, addressBook);
    logger.info(ethData.json, "ethData.json");
    expect(tx).to.be.ok;
    expect(tx.sources).to.include(Guards.Ethereum);
    expect(getTransactionsError([tx])).to.be.null;
  });

  it.skip("should sync & parse an address book", async () => {
    const addressBook = getTestAddressBook(
      "evm:1:0x1057bea69c9add11c6e3de296866aff98366cfe3",
      "evm:1:0x2610a8d6602d7744174181348104dafc2ad94b28",
    );
    await ethData.syncAddressBook(addressBook);
    const transactions = ethData.getTransactions(addressBook);
    logger.info(transactions, "transactions");
    expect(transactions[0].sources).to.include(Guards.Ethereum);
    expect(getTransactionsError(transactions)).to.be.null;
  });

});

