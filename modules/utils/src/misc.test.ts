import { expect } from "chai";

import { diffBalances } from "./misc";

describe("Misc Utils", () => {

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
