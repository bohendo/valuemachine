import { getValueMachine } from "@valuemachine/core";
import {
  getTestAddressBook,
  Assets,
  getTestTx,
  TransferCategories,
} from "@valuemachine/transactions";
import { getLogger, msPerDay, toTime, toISOString } from "@valuemachine/utils";
import { expect } from "chai";

import { getPriceFns } from "./prices";
import { PriceFns } from "./types";
import { toDay } from "./utils";

const log = getLogger(process.env.LOG_LEVEL || "warn", "TestPrices");

describe("Prices", () => {
  let prices: PriceFns;
  const source = "Test";

  beforeEach(() => {
    prices = getPriceFns({ logger: log });
    expect(prices.getJson().length).to.equal(0);
  });

  it("should return an interpolated price if no exact value is available", async () => {
    const [d1, d2, d3] = ["2021-12-01", "2021-12-02", "2021-12-03"].map(toDay);
    prices.merge([
      { date: d1, unit: "A", asset: "B", price: "1", source },
      { date: d3, unit: "A", asset: "B", price: "3", source },
    ]);
    const price = prices.getPrice(d2, "B", "A");
    expect(price).to.equal("2.0");
  });

  it("should find a valid path between prices", async () => {
    // This price graph is adversarial to ensure it's a worst-case
    // C1,C2,C3 form a cycle, the C2 branch requires backtracking
    const date = "2020-01-01T12:00:00Z";
    prices.merge([
      { date, unit: "C1", asset: "C2", price: "1", source },
      { date, unit: "C2", asset: "C3", price: "1", source },
      { date, unit: "C1", asset: "C3", price: "1", source },
      { date, unit: "C1", asset: "C1A", price: "2", source },
      { date, unit: "C1A", asset: "C1B", price: "2", source },
      { date, unit: "C1B", asset: "C1C", price: "2", source },
      { date, unit: "C2", asset: "C2A", price: "1", source },
      { date, unit: "C2A", asset: "C2B", price: "1", source },
      { date, unit: "C2A", asset: "C2C", price: "1", source },
      { date, unit: "C2C", asset: "C2D", price: "1", source },
      { date, unit: "C3", asset: "C3A", price: "1", source },
      { date, unit: "C3A", asset: "C3B", price: "1", source },
    ]);
    expect(prices.getPrice(date, "C1C", "C1")).to.equal("8.0");
  });

  it("should pathfind across several interpolated prices", async () => {
    const [d1, d2, d3] = ["2021-12-01", "2021-12-02", "2021-12-03"].map(toDay);
    prices.merge([
      { date: d1, unit: "A", asset: "B", price: "1", source },
      { date: d3, unit: "A", asset: "B", price: "3", source },
      { date: d1, unit: "B", asset: "C", price: "1", source },
      { date: d3, unit: "B", asset: "C", price: "3", source },
      { date: d2, unit: "C", asset: "D", price: "2", source },
    ]);
    const price = prices.getPrice(d2, "D", "A");
    expect(price).to.equal("8.0");
  });

  it.skip("should pathfind reasonably quickly", async () => {
    const repeat = (n: number, fn: any): any[] => {
      return "0".repeat(n).split("").map((v, i) => fn(i));
    };
    const getRandomEntry = (startDate) => {
      const seed = Math.random();
      const last = parseInt(seed.toString().substring(5, 6));
      return {
        date: toISOString(Math.round(toTime(startDate) + seed * 90 * msPerDay)),
        unit: last <= 3 ? "AA" : last <= 6 ? "BB" : "CC",
        asset: last <= 3 ? "BB" : last <= 6 ? "CC" : "DD",
        price: (last + 1).toString(),
        source: "RNG",
      };
    };
    const [d1, d2, d3] = ["2021-01-01", "2021-01-02", "2021-01-03"].map(toDay);
    prices.merge([
      { date: d1, unit: "AA", asset: "BB", price: "1", source },
      { date: d3, unit: "AA", asset: "BB", price: "3", source },
      { date: d1, unit: "BB", asset: "CC", price: "1", source },
      { date: d3, unit: "BB", asset: "CC", price: "3", source },
      { date: d2, unit: "CC", asset: "DD", price: "2", source },
      ...(repeat(400, () => getRandomEntry("2020-09-01"))),
      ...(repeat(400, () => getRandomEntry("2021-01-04"))),
    ]);
    const n = 20;
    const start = Date.now();
    repeat(n, () => {
      expect(prices.getPrice(d2, "BB", "AA")).to.equal("2.0");
      expect(prices.getPrice(d2, "CC", "AA")).to.equal("4.0");
      expect(prices.getPrice(d2, "DD", "AA")).to.equal("8.0");
    });
    const rate = Math.round((n * 30000) / (Date.now() - start))/10;
    log.info(`Found ${n*3} prices at a rate of ${rate} paths found per second`);
    expect(rate).to.be.gt(100);
  });

  it.skip("should calculate prices from ValueMachine data", async () => {
    const me = "Ethereum/0x1111111111111111111111111111111111111111";
    const notMe = "Ethereum/0x2222222222222222222222222222222222222222";
    const vm = getValueMachine({ addressBook: getTestAddressBook(me) });
    const { Income, SwapIn, SwapOut } = TransferCategories;
    [getTestTx([
      { amount: "100", asset: "A", category: Income, from: notMe, to: me },
    ]), getTestTx([
      { amount: "4", asset: "A", category: SwapOut, from: me, to: notMe },
      { amount: "2", asset: "B", category: SwapIn, from: notMe, to: me },
    ]), getTestTx([
      { amount: "4", asset: "A", category: SwapOut, from: me, to: notMe },
      { amount: "2", asset: "B", category: SwapOut, from: me, to: notMe },
      { amount: "1", asset: "C", category: SwapIn, from: notMe, to: me },
    ]), getTestTx([
      { amount: "1", asset: "C", category: SwapOut, from: me, to: notMe },
      { amount: "8", asset: "A", category: SwapIn, from: notMe, to: me },
      { amount: "4", asset: "B", category: SwapIn, from: notMe, to: me },
    ]), getTestTx([
      { amount: "8", asset: "B", category: SwapOut, from: me, to: notMe },
      { amount: "2", asset: "A", category: SwapIn, from: notMe, to: me },
    ])].forEach(vm.execute);
    await prices.syncPrices(vm, Assets.ETH);
    expect(prices.getPrice("2020-01-02T01:00:00.000Z", "B", "A")).to.equal("2.0");
    expect(prices.getPrice("2020-01-03T01:00:00.000Z", "C", "A")).to.equal("8.0");
  });

});
