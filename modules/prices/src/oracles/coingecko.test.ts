import { Assets } from "@valuemachine/transactions";
import { getLogger, math, toISOString } from "@valuemachine/utils";
import { expect } from "chai";

import { fetchCoinGeckoPrice } from "./coingecko";

const log = getLogger(process.env.LOG_LEVEL || "debug", "TestCoinGecko");
const { ETH, USD } = Assets;

// Tests that require network calls might be fragile, skip them unless we're actively debugging
describe.skip("CoinGecko", () => {

  it("should fetch the price of an asset", async () => {
    const date = "2021-12-01T00:00:00Z";
    const price = await fetchCoinGeckoPrice(date, ETH, USD, log);
    log.info(`Fetched ${ETH} price on ${date}: ${price} ${USD}`);
    expect(price).to.be.a("string");
  });

  it("should handle rate limits gracefully", async () => {
    // trigger a rate limit
    const ethLaunchish = new Date("2017-01-01").getTime();
    const getRandomDate = () => new Date(Math.round(
      ethLaunchish + (Math.random() * (Date.now() - ethLaunchish))
    ));
    log.info(`Starting rate limit test`);
    const dates = "0".repeat(42).split("").map(() => getRandomDate());
    const results = await Promise.all(dates.map(date =>
      fetchCoinGeckoPrice(toISOString(date), ETH, USD, log)
    ));
    for (const i in results) {
      log.info(`On ${
        toISOString(dates[i]).split("T")[0]
      } 1 ETH was worth $${math.round(results[i])}`);
      expect(math.gt(results[i], "0")).to.be.true;
    }
  });

});
