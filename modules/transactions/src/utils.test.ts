import { Transfer } from "@valuemachine/types";
import { expect } from "chai";

import { sumTransfers } from "./utils";

describe("Transaction Utils", () => {

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

