import { AddressZero } from "@ethersproject/constants";
import { TransferCategories } from "@valuemachine/types";

import { getTransactionsError } from "./transactions";
import { expect } from "./testUtils";

const validTransaction = {
  apps: [],
  index: 0,
  date: new Date(0).toISOString(),
  uuid: "UniversallyUniqueIdentifier",
  sources: [],
  transfers: [{
    asset: "ETH",
    category: TransferCategories.Expense,
    from: AddressZero,
    to: AddressZero,
    amount: "0",
  }],
};

describe("Transactions", () => {
  it("should return no errors if json is valid", async () => {
    expect(getTransactionsError([validTransaction])).to.be.null;
  });

  it("should return an error if the json is invalid", async () => {
    expect(getTransactionsError([{ ...validTransaction, date: null }])).to.be.a("string");
  });

  it("should return an error if an index property mismatches array index", async () => {
    expect(getTransactionsError([{ ...validTransaction, index: 1 }])).to.be.a("string");
  });

});
