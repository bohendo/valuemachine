import { getPricesError } from "./prices";
import { expect } from "./testUtils";

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

  // TODO: is this even possible w typebox?
  it.skip("should return an error if the top-level key isn't a date", async () => {
    expect(getPricesError({ foo: { ...validPrices.foo } })).to.be.a("string");
  });

});

