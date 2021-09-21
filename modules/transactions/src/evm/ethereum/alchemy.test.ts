import { getTransactionsError } from "@valuemachine/utils";

import { Guards } from "../../enums";
import {
  env,
  expect,
  getTestAddressBook,
  // testStore,
  testLogger,
} from "../testUtils";

import { getAlchemyData } from "./alchemy";

const logger = testLogger.child({ module: `TestEthereum` }, { level: "trace" });

// Skip tests that require network calls unless we're actively debugging
describe.skip("Alchemy Fetcher", () => {

  it("should sync a transaction that includes a self-destruction", async () => {
    const ethData = getAlchemyData({
      providerUrl: env.alchemyProvider,
      logger,
    });
    const addressBook = getTestAddressBook("Ethereum/0xeb56b369ddaa70034f94ba195f4377e895b919cf");
    const hash = "0x4a4771995b71469253c3c9eb861854059ce113709a4b2e0325bdff630aeef474";
    await ethData.syncTransaction(hash);
    const tx = ethData.getTransaction(hash, addressBook);
    logger.info(ethData.json, "ethData.json");
    expect(tx).to.be.ok;
    expect(tx.sources).to.include(Guards.Ethereum);
    expect(getTransactionsError([tx])).to.be.null;
  });

  it("should sync transaction data for an EIP1559 tx", async () => {
    const ethData = getAlchemyData({
      providerUrl: env.alchemyProvider,
      logger,
    });
    const addressBook = getTestAddressBook("Ethereum/0x1057bea69c9add11c6e3de296866aff98366cfe3");
    const hash = "0xd82512c2168a0bd4d06be646ef34b804b94b098a96a46bd1df7429a4c35fc8ed";
    await ethData.syncTransaction(hash);
    const tx = ethData.getTransaction(hash, addressBook);
    logger.info(ethData.json, "ethData.json");
    expect(tx).to.be.ok;
    expect(tx.sources).to.include(Guards.Ethereum);
    expect(getTransactionsError([tx])).to.be.null;
  });

  it("should sync & parse an address book", async () => {
    const ethData = getAlchemyData({
      providerUrl: env.alchemyProvider,
      logger,
    });
    const addressBook = getTestAddressBook("Ethereum/0xDD8251bB8e7Ba07DfcD9e1842CD9E3cDfc0399C8");
    await ethData.syncAddressBook(addressBook);
    const transactions = ethData.getTransactions(addressBook);
    expect(transactions[0].sources).to.include(Guards.Ethereum);
    expect(getTransactionsError(transactions)).to.be.null;
  });
});
