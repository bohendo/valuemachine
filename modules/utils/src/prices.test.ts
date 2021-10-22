import { expect } from "chai";

import { getPricesError } from "./prices";

const validPrices = {
  foo: {
    bar: {
      baz: "0",
    },
  },
};

describe("Prices", () => {

  it("should return no errors if json is valid", async () => {
    expect(getPricesError(validPrices)).to.equal("");
  });

  it("should return an error if the json is invalid", async () => {
    expect(getPricesError({ foo: { bar: "baz" } })).to.be.a("string");
  });

});

