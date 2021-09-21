import {
  env,
  expect,
  testLogger,
} from "../testUtils";

import { getPolygonscanFetcher } from "./polygonscan";

const logger = testLogger.child({ module: "Etherscan Fetcher" }, { level: "debug" });

// Skip tests that require network calls unless we're actively debugging
describe.skip("Etherscan Fetcher", () => {

  it.skip("should fetch a transaction that includes a contract creation", async () => {
    const fetcher = getPolygonscanFetcher({ apiKey: env.polygonscanKey, logger });
    const hash = "???";
    const tx = await fetcher.fetchTransaction(hash);
    logger.info(tx);
    expect(tx).to.be.ok;
  });

  it.skip("should fetch a transaction that includes a contract self-destruction", async () => {
    const fetcher = getPolygonscanFetcher({ apiKey: env.polygonscanKey, logger });
    const hash = "???";
    const tx = await fetcher.fetchTransaction(hash);
    logger.info(tx);
    expect(tx).to.be.ok;
  });

  it.skip("should fetch an EIP1559 transaction", async () => {
    const fetcher = getPolygonscanFetcher({ apiKey: env.polygonscanKey, logger });
    const hash = "???";
    const tx = await fetcher.fetchTransaction(hash);
    logger.info(tx);
    expect(tx).to.be.ok;
  });

  it.skip("should fetch history for an address", async () => {
    const fetcher = getPolygonscanFetcher({ apiKey: env.polygonscanKey, logger });
    const address = "???";
    const history = await fetcher.fetchHistory(address);
    logger.info(history);
    expect(history).to.be.ok;
  });

  it.skip("should sync & parse an address w zero transactions", async () => {
    const fetcher = getPolygonscanFetcher({ apiKey: env.polygonscanKey, logger });
    const address = "???";
    const history = await fetcher.fetchHistory(address);
    logger.info(history);
    expect(history).to.be.ok;
  });

});

