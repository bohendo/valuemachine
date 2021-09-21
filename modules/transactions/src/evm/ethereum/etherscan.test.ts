import {
  env,
  expect,
  testLogger,
} from "../testUtils";

import { getEtherscanFetcher } from "./etherscan";

const logger = testLogger.child({ module: "Etherscan Fetcher" }, { level: "debug" });

// Skip tests that require network calls unless we're actively debugging
describe.skip("Etherscan Fetcher", () => {

  it("should fetch a transaction that includes a contract creation", async () => {
    const fetcher = getEtherscanFetcher({ apiKey: env.etherscanKey, logger });
    const hash = "0x7fd11478180d9aca3d722cefe737c83c537d29b29ccc4afccea0f523005a53a4";
    const tx = await fetcher.fetchTransaction(hash);
    logger.info(tx);
    expect(tx).to.be.ok;
  });

  it("should fetch a transaction that includes a contract self-destruction", async () => {
    const fetcher = getEtherscanFetcher({ apiKey: env.etherscanKey, logger });
    const hash = "0x4a4771995b71469253c3c9eb861854059ce113709a4b2e0325bdff630aeef474";
    const tx = await fetcher.fetchTransaction(hash);
    logger.info(tx);
    expect(tx).to.be.ok;
  });

  it("should fetch an EIP1559 transaction", async () => {
    const fetcher = getEtherscanFetcher({ apiKey: env.etherscanKey, logger });
    const hash = "0xd82512c2168a0bd4d06be646ef34b804b94b098a96a46bd1df7429a4c35fc8ed";
    const tx = await fetcher.fetchTransaction(hash);
    logger.info(tx);
    expect(tx).to.be.ok;
  });

  it("should fetch history for an address", async () => {
    const fetcher = getEtherscanFetcher({ apiKey: env.etherscanKey, logger });
    const address = "0xDD8251bB8e7Ba07DfcD9e1842CD9E3cDfc0399C8";
    const history = await fetcher.fetchHistory(address);
    logger.info(history);
    expect(history).to.be.ok;
  });

  it("should sync & parse an address w zero transactions", async () => {
    const fetcher = getEtherscanFetcher({ apiKey: env.etherscanKey, logger });
    const address = "0xBeD6B644203881AAE28072620433524a66A37B87";
    const history = await fetcher.fetchHistory(address);
    logger.info(history);
    expect(history).to.be.ok;
  });

});

