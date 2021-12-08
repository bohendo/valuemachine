import { expect } from "chai";

import { AssetChunk } from "./types";
import {
  getValueMachineError,
  sumChunks,
} from "./utils";

const validVM = {
  date: new Date(0).toISOString(),
  events: [],
  chunks: [],
};

describe("VM Utils", () => {
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

});
