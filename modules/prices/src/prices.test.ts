import { AssetChunk } from "@valuemachine/core";
import { Assets } from "@valuemachine/transactions";
import { DateString } from "@valuemachine/types";
import { getLogger, math, msPerDay, toISOString, toTime } from "@valuemachine/utils";
import { expect } from "chai";

import { getPriceFns } from "./prices";
import { PriceFns } from "./types";

const log = getLogger(process.env.LOG_LEVEL || "warn", "TestPrices");
const { DAI, USD, ETH, cDAI, MKR, SAI, UNI } = Assets;
const { round } = math;

describe("Prices", () => {
  let prices: PriceFns;
  const date = "2020-01-01T12:00:00Z";
  const source = "Test";
  const getDate = (index: number): DateString =>
    toISOString(toTime(date) + (index * msPerDay));

  beforeEach(() => {
    prices = getPriceFns({ logger: log });
    expect(prices.getJson().length).to.equal(0);
  });

  it("should return an interpolated price if no exact value is available", async () => {
    const [unit, asset] = [USD, ETH];
    prices.merge([
      { date: "2020-01-01T12:00:00Z", unit, asset, price: "1000", source },
      { date: "2020-01-04T12:00:00Z", unit, asset, price: "1500", source },
    ]);
    const price = prices.getPrice("2020-01-03T12:00:00Z", asset, unit);
    expect(math.gt(price, "1000")).to.be.true;
    expect(math.lt(price, "1500")).to.be.true;
  });

  it("should set & get prices", async () => {
    const usdPerEth = "1234";
    const ethPerDai = "0.0008";
    const ethPerMkr = "1.234";
    const daiPerCDai = "0.02041";
    prices.merge([
      { date, unit: USD, asset: ETH, price: usdPerEth, source },
      { date, unit: ETH, asset: DAI, price: ethPerDai, source },
      { date, unit: ETH, asset: MKR, price: ethPerMkr, source },
      { date, unit: DAI, asset: cDAI, price: daiPerCDai, source },
    ]);
    log.info(prices.getJson(), `All prices on ${date}`);
    expect(round(prices.getPrice(date, ETH, USD))).to.equal(round(usdPerEth));
    expect(round(prices.getPrice(date, DAI, ETH))).to.equal(round(ethPerDai));
    expect(round(prices.getPrice(date, MKR, ETH))).to.equal(round(ethPerMkr));
    expect(round(prices.getPrice(date, cDAI, DAI))).to.equal(round(daiPerCDai));
    expect(
      round(prices.getPrice(date, cDAI, USD))
    ).to.equal(
      round(math.mul(usdPerEth, ethPerDai, daiPerCDai))
    );
  });

  // This price graph is adversarial to ensure it's a worst-case that requires backtracking
  it("should find a proper path between prices", async () => {
    const [AETH, BETH, CETH, DETH, FETH, PETH, TEST, WTEST, cDAI, acDAI] =
      ["AETH", "BETH", "CETH", "DETH", "FETH", "PETH", "TEST", "WTEST", "cDAI", "acDAI"];
    prices.merge([
      { date, unit: ETH, asset: PETH, price: "1.0132", source },
      { date, unit: ETH, asset: DAI, price: "0.0022", source },
      { date, unit: ETH, asset: AETH, price: "1", source },
      { date, unit: AETH, asset: BETH, price: "1", source },
      { date, unit: BETH, asset: CETH, price: "1", source },
      { date, unit: DETH, asset: TEST, price: "1", source },
      { date, unit: FETH, asset: WTEST, price: "1", source },
      { date, unit: cDAI, asset: acDAI, price: "1", source },
      { date, unit: PETH, asset: DETH, price: "1", source },
      { date, unit: PETH, asset: FETH, price: "0.9869", source },
      { date, unit: DAI, asset: cDAI, price: "0.02", source },
      { date, unit: DAI, asset: SAI, price: "1", source },
      { date, unit: SAI, asset: PETH, price: "458.351", source },
      { date, unit: SAI, asset: MKR, price: "569.8779", source },
      { date, unit: MKR, asset: SAI, price: "0.00175", source },
    ]);
    log.info(prices.getJson(), `All prices`);
    expect(prices.getPrice(date, "CETH", ETH)).to.be.ok;
  });

  it("should calculate some prices from traded chunks", async () => {
    const amts = ["1.1", "0.1", "50", "2"];
    await prices.syncChunks([
      {
        asset: ETH,
        history: [{ date: getDate(1), guard: ETH }],
        disposeDate: getDate(2),
        amount: amts[0],
        index: 0,
        inputs: [],
        outputs: [1],
      },
      {
        asset: ETH,
        history: [{ date: getDate(2), guard: ETH }],
        amount: amts[1],
        index: 0,
        inputs: [0],
        outputs: [],
      },
      {
        asset: UNI,
        history: [{ date: getDate(2), guard: ETH }],
        disposeDate: getDate(3),
        amount: amts[2],
        index: 1,
        inputs: [0],
        outputs: [2],
      },
      {
        asset: ETH,
        history: [{ date: getDate(3), guard: ETH }],
        disposeDate: getDate(4),
        amount: amts[3],
        index: 2,
        inputs: [1],
        outputs: [],
      },
    ] as AssetChunk[], ETH);
    expect(prices.getPrice(getDate(2), UNI, ETH)).to.equal(
      math.div(math.sub(amts[0], amts[1]), amts[2])
    );
    expect(prices.getPrice(getDate(3), UNI, ETH)).to.equal(math.div(amts[3], amts[2]));
  });

  // Tests that require network calls might be fragile, skip them for now
  it.skip("should handle rate limits gracefully", async () => {
    // trigger a rate limit
    const ethLaunchish = new Date("2017-01-01").getTime();
    const getRandomDate = () => new Date(Math.round(
      ethLaunchish + (Math.random() * (Date.now() - ethLaunchish))
    ));
    log.info(`Starting rate limit test`);
    const dates = "0".repeat(42).split("").map(() => getRandomDate());
    const results = await Promise.all(dates.map(date => prices.syncPrice(date, ETH, USD)));
    for (const i in results) {
      log.info(`On ${
        toISOString(dates[i]).split("T")[0]
      } 1 ETH was worth $${round(results[i])}`);
      expect(math.gt(results[i], "0")).to.be.true;
    }
  });

});
