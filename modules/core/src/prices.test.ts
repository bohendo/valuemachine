import { AssetTypes, Prices } from "@finances/types";
import { expect, math } from "@finances/utils";

import { getPrices } from "./prices";
import { testLogger } from "./testing";

const log = testLogger.child({
  // level: "debug",
  module: "TestPrices",
});

const { mul, round } = math;
const { USD, ETH, PETH, WETH } = AssetTypes;

describe.skip("Prices", () => {
  let prices: Prices;
  const date = "2020-01-01";

  beforeEach(() => {
    prices = getPrices({ logger: log });
    expect(Object.keys(prices.json).length).to.equal(0);
  });

  it("should set & get prices", async () => {
    const usdPerEth = "1234";
    const ethPerWeth = "1.00";
    const wethPerPeth = "1.01";
    prices.setPrice(wethPerPeth, date, PETH, WETH);
    expect(round(prices.getPrice(date, PETH, WETH))).to.equal(round(wethPerPeth));
    prices.setPrice(usdPerEth, date, WETH, ETH);
    expect(round(prices.getPrice(date, WETH, ETH))).to.equal(round(ethPerWeth));
    prices.setPrice(usdPerEth, date, ETH, USD);
    expect(round(prices.getPrice(date, ETH, USD))).to.equal(round(usdPerEth));
    expect(
      round(prices.getPrice(date, PETH, USD))
    ).to.equal(
      round(mul(wethPerPeth, ethPerWeth, usdPerEth))
    );
  });

});


