import { Assets } from "@valuemachine/transactions";
import { getLogger, math, toISOString, toTime } from "@valuemachine/utils";
import { expect } from "chai";

import { PriceSources } from "../types";

import { getCoinGeckoEntries } from "./coingecko";

const source = PriceSources.CoinGecko;
const log = getLogger(process.env.LOG_LEVEL || "warn", "TestCoinGecko");
const { ETH, USD } = Assets;

const dec1 =  {
  date: "2021-12-01T00:00:00Z",
  unit: USD,
  asset: ETH,
  price: "4637.121616831405",
  source,
};

const dec2 =  {
  date: "2021-12-02T00:00:00Z",
  unit: USD,
  asset: ETH,
  price: "4589.610617539151",
  source,
};

let counter = 0;
const setPrice = (newPrices) => { log.info(newPrices, `setPrice #${counter++}`); };

describe("CoinGecko", () => {

  it("should not re-fetch existing entries for a daily price", async () => {
    const date = "2021-12-01T00:00:00Z";
    counter = 0;
    const prices = await getCoinGeckoEntries([dec1], date, ETH, USD, setPrice, log);
    log.info(prices, `Got ${prices.length} entry for ${USD} price of ${ETH} on ${date}`);
    expect(prices.length).to.equal(1);
    expect(counter).to.equal(0);
  });

  it("should not re-fetch existing entries for an hourly price", async () => {
    const date = "2021-12-01T12:34:56Z";
    counter = 0;
    const prices = await getCoinGeckoEntries([dec1, dec2], date, ETH, USD, setPrice, log);
    log.info(prices, `Got ${prices.length} entries for ${USD} price of ${ETH} on ${date}`);
    expect(prices.length).to.equal(2);
    expect(counter).to.equal(0);
  });

  // Tests that require network calls might be fragile, skip them unless we're actively debugging
  it.skip("should fetch one new entry for a daily price", async () => {
    const date = "2021-12-01T00:00:00Z";
    counter = 0;
    const prices = await getCoinGeckoEntries([], date, ETH, USD, setPrice, log);
    log.info(prices, `Got ${prices.length} entry for ${USD} price of ${ETH} on ${date}`);
    expect(prices.length).to.equal(1);
    expect(counter).to.equal(1);
  });
  it.skip("should fetch two new entries for an hourly price", async () => {
    const date = "2021-12-01T12:34:56Z";
    counter = 0;
    const prices = await getCoinGeckoEntries([], date, ETH, USD, setPrice, log);
    log.info(prices, `Got ${prices.length} entries for ${USD} price of ${ETH} on ${date}`);
    expect(prices.length).to.equal(2);
    expect(counter).to.equal(2);
  });
  it.skip("should fetch one new entry for an hourly price if the other is given", async () => {
    const date = "2021-12-01T12:34:56Z";
    counter = 0;
    let prices = await getCoinGeckoEntries([dec1], date, ETH, USD, setPrice, log);
    log.info(prices, `Got ${prices.length} entries for ${USD} price of ${ETH} on ${date}`);
    expect(prices.length).to.equal(2);
    expect(counter).to.equal(1);
    // Test again but provide the other entry instead
    counter = 0;
    prices = await getCoinGeckoEntries([dec2], date, ETH, USD, setPrice, log);
    log.info(prices, `Got ${prices.length} entries for ${USD} price of ${ETH} on ${date}`);
    expect(prices.length).to.equal(2);
    expect(counter).to.equal(1);
  });
  it.skip("should handle rate limits gracefully", async () => {
    log.info(`Starting rate limit test`);
    const ethLaunchish = toTime("2017-01-01T00:00:00Z");
    const getRandomDate = () => toISOString(Math.round(
      ethLaunchish + (Math.random() * (Date.now() - ethLaunchish))
    ));
    const dates = "0".repeat(32).split("").map(() => getRandomDate());
    const results = await Promise.all(dates.map(date =>
      getCoinGeckoEntries([], date, ETH, USD, setPrice, log)
    ));
    for (const i in results) {
      for (const j in results[i]) {
        log.info(`On ${
          toISOString(dates[i]).split("T")[0]
        } 1 ETH was worth $${math.round(results[i][j].price)}`);
        expect(math.gt(results[i][j].price, "0")).to.be.true;
      }
    }
  });
});
