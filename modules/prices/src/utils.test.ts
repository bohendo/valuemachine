import { Assets } from "@valuemachine/transactions";
import { expect } from "chai";

import { getEmptyPrices, getPricesError } from "./utils";

const validPrices = [{
  date: new Date().toISOString(),
  unit: Assets.DAI,
  asset: Assets.ETH,
  price: "4500.12",
  source: "Test/1",
}, {
  date: new Date().toISOString(),
  unit: Assets.DAI,
  asset: Assets.BTC,
  price: "45000.12",
  source: "Test/2",
}];

describe("Price Utils", () => {

  it("should return no errors if json is valid", async () => {
    expect(getPricesError(validPrices)).to.equal("");
  });

  it("should provide valid empty prices", async () => {
    expect(getPricesError(getEmptyPrices())).to.equal("");
  });

  it("should return an error if the json is invalid", async () => {
    expect(getPricesError({ foo: { bar: { baz: "1" } } })).to.be.a("string");
  });

});
