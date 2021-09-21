import {
  env,
  expect,
  testLogger,
} from "../testUtils";

import { getPolygonscanFetcher } from "./polygonscan";

const logger = testLogger.child({ module: "Polygonscan Fetcher" }, { level: "trace" });

// Skip tests that require network calls unless we're actively debugging
describe.skip("Polygonscan Fetcher", () => {

  it("should fetch a simple transaction", async () => {
    const fetcher = getPolygonscanFetcher({ apiKey: env.polygonscanKey, logger });
    const hash = "0xbc9eeccec4c8c020fa04feb8ff882b933dea40b46eb60a63d803c1668d87ea3c";
    const tx = await fetcher.fetchTransaction(hash);
    logger.info(tx);
    expect(tx).to.be.ok;
  });

  it("should fetch history for an address", async () => {
    const fetcher = getPolygonscanFetcher({ apiKey: env.polygonscanKey, logger });
    const address = "0x1057Bea69c9ADD11c6e3dE296866AFf98366CFE3";
    const history = await fetcher.fetchHistory(address);
    logger.info(history);
    expect(history).to.be.ok;
  });


  it("should sync & parse an address w zero transactions", async () => {
    const fetcher = getPolygonscanFetcher({ apiKey: env.polygonscanKey, logger });
    const address = "0xBeD6B644203881AAE28072620433524a66A37B87";
    const history = await fetcher.fetchHistory(address);
    logger.info(history);
    expect(history).to.be.ok;
  });

});

