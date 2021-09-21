import {
  env,
  expect,
  testLogger,
} from "../testUtils";

import { getAlchemyFetcher } from "./alchemy";

const logger = testLogger.child({ module: "Alchemy Fetcher" }, { level: "trace" });

// Skip tests that require network calls unless we're actively debugging
describe.skip("Alchemy Fetcher", () => {

  // TODO: We still need a way to find zero-value transactions so we can account for tx fees
  it.skip("should fetch history for an address including zero-value txns", async () => {
    const fetcher = getAlchemyFetcher({ providerUrl: env.alchemyProvider, logger });
    const address = "0x1057Bea69c9ADD11c6e3dE296866AFf98366CFE3";
    const history = await fetcher.fetchHistory(address);
    logger.info(history);
    expect(history).to.include("0x003d029001bf6ffd60f652d91e302819c6e4f1e3af00fc5ba9f3928cbda74d2d");
    expect(history).to.be.ok;
  });

  it("should sync & parse an address w zero transactions", async () => {
    const fetcher = getAlchemyFetcher({ providerUrl: env.alchemyProvider, logger });
    const address = "0xBeD6B644203881AAE28072620433524a66A37B87";
    const history = await fetcher.fetchHistory(address);
    logger.info(history);
    expect(history).to.be.ok;
  });

  it("should fetch an old transaction", async () => {
    const fetcher = getAlchemyFetcher({ providerUrl: env.alchemyProvider, logger });
    const hash = "0x41a3720d7b1401ebc68e53fdd829cdb30df26cc8eb8b01e35d8cf9d36468aa6e";
    const tx = await fetcher.fetchTransaction(hash);
    logger.info(tx);
    expect(tx).to.be.ok;
  });

  it("should fetch a transaction that includes a contract creation", async () => {
    const fetcher = getAlchemyFetcher({ providerUrl: env.alchemyProvider, logger });
    const hash = "0x7fd11478180d9aca3d722cefe737c83c537d29b29ccc4afccea0f523005a53a4";
    const tx = await fetcher.fetchTransaction(hash);
    logger.info(tx);
    expect(tx).to.be.ok;
  });

  it("should fetch a transaction that includes a contract self-destruction", async () => {
    const fetcher = getAlchemyFetcher({ providerUrl: env.alchemyProvider, logger });
    const hash = "0x4a4771995b71469253c3c9eb861854059ce113709a4b2e0325bdff630aeef474";
    const tx = await fetcher.fetchTransaction(hash);
    logger.info(tx);
    expect(tx).to.be.ok;
  });

  it("should fetch an EIP1559 transaction", async () => {
    const fetcher = getAlchemyFetcher({ providerUrl: env.alchemyProvider, logger });
    const hash = "0xd82512c2168a0bd4d06be646ef34b804b94b098a96a46bd1df7429a4c35fc8ed";
    const tx = await fetcher.fetchTransaction(hash);
    logger.info(tx);
    expect(tx).to.be.ok;
  });

});
