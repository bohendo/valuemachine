import {
  Assets,
  AssetChunk,
  DateString,
  Prices,
} from "@valuemachine/types";
import {
  div,
  gt,
  mul,
  round,
} from "@valuemachine/utils";

import { getPrices } from "./prices";
import {
  expect,
  testLogger,
} from "./testUtils";

const { DAI, USD, ETH, cDAI, MKR, UNI } = Assets;
const log = testLogger.child({ module: "TestPrices",
  // level: "debug",
});

describe("Prices", () => {
  let prices: Prices;
  const date = "2020-01-01";
  const getDate = (index: number): DateString =>
    new Date(new Date(date).getTime() + (index * 1000 * 60 * 60 * 24)).toISOString();

  beforeEach(() => {
    prices = getPrices({ logger: log });
    expect(Object.keys(prices.json).length).to.equal(0);
  });

  it("should calculate some prices from traded chunks", async () => {
    const amts = ["1", "50", "2"];
    await prices.syncChunks([
      {
        asset: ETH,
        receiveDate: getDate(1),
        disposeDate: getDate(2),
        quantity: amts[0],
        index: 0,
        inputs: [],
        outputs: [1],
      },
      {
        asset: UNI,
        receiveDate: getDate(2),
        disposeDate: getDate(3),
        quantity: amts[1],
        index: 1,
        inputs: [0],
        outputs: [2],
      },
      {
        asset: ETH,
        receiveDate: getDate(3),
        disposeDate: getDate(4),
        quantity: amts[2],
        index: 2,
        inputs: [1],
        outputs: [],
      },
    ] as AssetChunk[], ETH);
    expect(prices.getPrice(getDate(2), UNI, ETH)).to.equal(div(amts[0], amts[1]));
    expect(prices.getPrice(getDate(3), UNI, ETH)).to.equal(div(amts[2], amts[1]));
  });

  it("should set & get prices", async () => {
    const usdPerEth = "1234";
    const ethPerDai = "0.0008";
    const ethPerMkr = "1.234";
    const daiPerCDai = "0.02041";
    prices.merge({ [date]: {
      USD: {
        ETH: usdPerEth,
      },
      ETH: {
        DAI: ethPerDai,
        MKR: ethPerMkr,
      },
      DAI: {
        cDAI: daiPerCDai,
      },
    } });
    expect(round(prices.getPrice(date, ETH, USD))).to.equal(round(usdPerEth));
    expect(round(prices.getPrice(date, DAI, ETH))).to.equal(round(ethPerDai));
    expect(round(prices.getPrice(date, MKR, ETH))).to.equal(round(ethPerMkr));
    expect(round(prices.getPrice(date, cDAI, DAI))).to.equal(round(daiPerCDai));
    log.info(prices.json, `All prices on ${date}`);
    expect(
      round(prices.getPrice(date, cDAI, USD))
    ).to.equal(
      round(mul(usdPerEth, ethPerDai, daiPerCDai))
    );
  });

  // This price graph is adversarial to ensure it's a worst-case that requires backtracking
  it("should find a proper path between prices", async () => {
    prices.merge({ [date]: {
      ETH: {
        "PETH": "1.01324835228845479",
        "DAI": "0.0022106382659755107",
        "AETH": "1",
      },
      AETH: {
        "BETH": "1",
      },
      BETH: {
        "CETH": "1",
      },
      FETH: {
        "TEST": "1",
      },
      WETHy: {
        "WTEST": "1",
      },
      cDAI: {
        "acDAI": "1",
      },
      PETH: {
        "FETH": "1",
        "WETHy": "0.986924871618559309940522374665122283",
      },
      DAI: {
        "cDAI": "0.02",
        "SAI": "1",
      },
      SAI: {
        // "PETH": "458.351041816119249543",
        "MKR": "569.877871353024680810695929796535270104",
      },
      MKR: {
        "SAI": "0.00175476194158191084713006669037875",
      },
    } });
    log.info(prices.json, `All prices`);
    expect(prices.getPrice(date, "CETH", ETH)).to.be.ok;
  });

  // Tests that require network calls might be fragile, skip them for now
  it.skip("should fetch a price of assets not in the Assets enum", async () => {
    expect(await prices.syncPrice(new Date().toISOString(), "IDLE", USD)).to.be.ok;
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
        new Date(dates[i]).toISOString().split("T")[0]
      } 1 ETH was worth $${round(results[i])}`);
      expect(gt(results[i], "0")).to.be.true;
    }
  });

});
