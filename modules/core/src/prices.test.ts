import { AddressBook, AddressCategories, AssetTypes, Prices, Transactions } from "@finances/types";
import { expect, math } from "@finances/utils";

import { getPrices } from "./prices";
import { getRealChainData, getTestAddressBook, testLogger } from "./testing";
import { getTransactions } from "./transactions";

const log = testLogger.child({
  level: "debug",
  module: "TestPrices",
});

const { mul, round } = math;
const { DAI, USD, ETH, PETH, SPANK, sUSDv1, WETH } = AssetTypes;

describe.only("Prices", () => {
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

  it("should sync prices for a transaction from before Uniswap v1", async () => {
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

  it.only("should sync prices for a transaction from before Uniswap v2", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0xc30ef4493bae45ca817faaf122ba48276dc196f48cd3e7d154fd7266db0860db";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    await prices.syncTransaction(tx, ETH);
    log.info(prices.json, "All price data");
    expect(prices.getPrice(tx.date, sUSDv1, ETH)).to.be.ok;
    await prices.syncTransaction(tx, USD);
    log.info(prices.json, "All price data");
    expect(prices.getPrice(tx.date, sUSDv1, USD)).to.be.ok;
  });

  it("should sync prices for a transaction", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0xc2197b42053d1cd60c35707e4c2662d2aa84033918350bc979b84e727c236584";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    prices.syncTransaction(tx, ETH);
    expect(prices.getPrice(tx.date, DAI, ETH)).to.be.ok;
    prices.syncTransaction(tx, USD);
    expect(prices.getPrice(tx.date, DAI, USD)).to.be.ok;
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


