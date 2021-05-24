import { AddressBook, AddressCategories, Assets, Prices, Transactions } from "@finances/types";
import { expect, math } from "@finances/utils";

import { getPrices } from "./prices";
import { getRealChainData, getTestAddressBook, testLogger } from "./testing";
import { getTransactions } from "./transactions";

const log = testLogger.child({
  // level: "debug",
  module: "TestPrices",
});

const { mul, round } = math;
const { DAI, USD, ETH, cDAI, MKR, SPANK, sUSDv1 } = Assets;

describe("Prices", () => {
  let addressBook: AddressBook;
  let prices: Prices;
  let txns: Transactions;
  const date = "2020-01-01";

  beforeEach(() => {
    addressBook = getTestAddressBook();
    prices = getPrices({ logger: log });
    expect(Object.keys(prices.json).length).to.equal(0);
    txns = getTransactions({ addressBook, logger: log });
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
    const selfAddress = "0xada083a3c06ee526f827b43695f2dcff5c8c892b";
    const txHash = "0x3b384ecabf0bc6578c27c0a12d9561865f7fe8259d11ec53e9d22c692b415798";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    await prices.syncTransaction(tx, ETH);
    expect(prices.getPrice(tx.date, SPANK, ETH)).to.be.ok;
    await prices.syncTransaction(tx, USD);
    expect(prices.getPrice(tx.date, SPANK, USD)).to.be.ok;
  });
  it.skip("should sync prices for a transaction from before Uniswap v2", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0xc30ef4493bae45ca817faaf122ba48276dc196f48cd3e7d154fd7266db0860db";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
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
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0xc2197b42053d1cd60c35707e4c2662d2aa84033918350bc979b84e727c236584";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    await prices.syncTransaction(tx, ETH);
    expect(prices.getPrice(tx.date, DAI, ETH)).to.be.ok;
    await prices.syncTransaction(tx, USD);
    expect(prices.getPrice(tx.date, DAI, USD)).to.be.ok;
  });

});


