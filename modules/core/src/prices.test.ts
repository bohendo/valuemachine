import {
  Assets,
  Prices,
  TransferCategories
} from "@valuemachine/types";
import {
  gt,
  mul,
  round,
} from "@valuemachine/utils";

import { getPrices } from "./prices";
import {
  expect,
  getTx,
  testLogger,
  AddressOne,
  AddressThree,
} from "./testUtils";

const log = testLogger.child({
  // level: "debug",
  module: "TestPrices",
});

const ethAccount = AddressOne;
const notMe = AddressThree;

const { Expense, SwapIn, SwapOut } = TransferCategories;
const { DAI, USD, ETH, cDAI, MKR, SNX, SPANK, sUSDv1 } = Assets;

describe("Prices", () => {
  let prices: Prices;
  const date = "2020-01-01";

  beforeEach(() => {
    prices = getPrices({ logger: log });
    expect(Object.keys(prices.json).length).to.equal(0);
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
  it.skip("should sync prices for a transaction from before Uniswap v1", async () => {
    const tx = getTx([
      { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
      { asset: ETH, category: SwapOut, from: ethAccount, quantity: "3.0", to: notMe },
      { asset: SPANK, category: SwapIn, from: notMe, quantity: "50.00", to: ethAccount },
    ]);
    await prices.syncTransaction(tx, ETH);
    expect(prices.getPrice(tx.date, SPANK, ETH)).to.be.ok;
    await prices.syncTransaction(tx, USD);
    expect(prices.getPrice(tx.date, SPANK, USD)).to.be.ok;
  });
  it.skip("should sync prices for a transaction from before Uniswap v2", async () => {
    const tx = getTx([
      { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
      { asset: sUSDv1, category: SwapOut, from: ethAccount, quantity: "38.0", to: notMe },
      { asset: DAI, category: SwapIn, from: notMe, quantity: "37.0", to: ethAccount },
    ]);
    prices.merge({ [tx.date]: {
      USD: {
        ETH: "224.13487737180202",
        DAI: "1.0011585884975858",
      }
    } });
    await prices.syncTransaction(tx, USD);
    log.info(prices.json, "All price data");
    expect(prices.getPrice(tx.date, sUSDv1, USD)).to.be.ok;
    await prices.syncTransaction(tx, ETH);
    log.info(prices.json, "All price data");
    expect(prices.getPrice(tx.date, sUSDv1, ETH)).to.be.ok;
  });
  it.skip("should sync prices for a transaction", async () => {
    const tx = getTx([
      { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
      { asset: SNX, category: SwapOut, from: ethAccount, quantity: "500", to: notMe },
      { asset: DAI, category: SwapIn, from: notMe, quantity: "350", to: ethAccount },
    ]);
    await prices.syncTransaction(tx, ETH);
    expect(prices.getPrice(tx.date, DAI, ETH)).to.be.ok;
    await prices.syncTransaction(tx, USD);
    expect(prices.getPrice(tx.date, DAI, USD)).to.be.ok;
  });
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
