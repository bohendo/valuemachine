import { Assets } from "@valuemachine/transactions";
import { AssetChunk } from "@valuemachine/types";

import {
  expect,
} from "./testUtils";
import { sumChunks, diffBalances } from "./utils";

describe("Utils", () => {
  it("should sum chunks", async () => {
    expect(sumChunks([{
      asset: Assets.ETH,
      quantity: "1.0",
    }, {
      asset: Assets.ETH,
      quantity: "2.0",
    }, {
      asset: Assets.RAI,
      quantity: "3.0",
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
