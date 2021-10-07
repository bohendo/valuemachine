import { AssetChunk } from "@valuemachine/types";

import { expect } from "./testUtils";
import { getValueMachineError, sumChunks, sumTransfers, diffBalances } from "./vm";

const validVM = {
  date: new Date(0).toISOString(),
  events: [],
  chunks: [],
};

describe("ValueMachine", () => {
  it("should return no errors if json is valid", async () => {
    expect(getValueMachineError(validVM)).to.equal("");
  });

  it("should return an error if the json is invalid", async () => {
    expect(getValueMachineError({ ...validVM, events: "oops" })).to.be.a("string");
  });

  it("should sum chunks", async () => {
    expect(sumChunks([{
      asset: "ETH",
      amount: "-1.0",
    }, {
      asset: "ETH",
      amount: "2.0",
    }] as AssetChunk[])).to.deep.equal({
      ETH: "1.0",
    });
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
    }] as AssetChunk[])).to.deep.equal({
      ETH: "3.0",
      RAI: "3.0",
    });
  });

  it("should diff balances", async () => {
    expect(diffBalances([{
      ETH: "4.0",
    }, {
      ETH: "1.0",
      RAI: "3.0",
    }])).to.deep.equal([{
      ETH: "3.0",
    }, {
      RAI: "3.0",
    }]);
  });

});

