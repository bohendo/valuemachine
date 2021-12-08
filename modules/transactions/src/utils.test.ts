import { AddressZero } from "@ethersproject/constants";
import { expect } from "chai";

import { TransferCategories } from "./enums";
import { getTransactionsError, sumTransfers } from "./utils";
import { Transfer } from "./types";

const validTransaction = {
  apps: [],
  index: 0,
  date: new Date(0).toISOString(),
  method: "Unknown",
  uuid: "Ethereum/0xabc123",
  sources: [],
  tag: {},
  transfers: [{
    asset: "ETH",
    category: TransferCategories.Expense,
    from: AddressZero,
    to: AddressZero,
    amount: "0",
  }, {
    asset: "DAI",
    category: TransferCategories.Expense,
    from: AddressZero,
    to: AddressZero,
    amount: "ALL",
  }],
};

describe("Transaction Utils", () => {

  it("should return no errors if json is valid", async () => {
    expect(getTransactionsError([validTransaction])).to.equal("");
  });

  it("should return an error if the json is invalid", async () => {
    expect(getTransactionsError([{ ...validTransaction, date: null }])).to.be.a("string");
  });

  it("should return an error if an index property mismatches array index", async () => {
    expect(getTransactionsError([{ ...validTransaction, index: 1 }])).to.be.a("string");
  });

  it("should return no errors if tag is valid", async () => {
    expect(getTransactionsError([validTransaction])).to.equal("");
  });

  it("should sum transfers", async () => {
    expect(sumTransfers([{
      asset: "ETH",
      amount: "1.0",
    }, {
      asset: "ETH",
      amount: "2.0",
    }, {
      asset: "RAI",
      amount: "3.0",
    }] as Transfer[])).to.deep.equal({
      ETH: "3.0",
      RAI: "3.0",
    });
  });

});

