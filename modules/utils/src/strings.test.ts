import { expect } from "chai";

import {
  getAccountError,
  getAmountError,
  getAssetError,
  getDateTimeError,
  getDateError,
  getTxIdError,
} from "./strings";

describe("String", () => {

  it("should get account errors", async () => {
    expect(getAccountError("Ethereum/0xabc123")).to.equal("");
    expect(getAccountError("")).to.include("must match pattern");
  });

  it("should get amount errors", async () => {
    expect(getAmountError("10")).to.equal("");
    expect(getAmountError("ALL")).to.equal("");
    expect(getAmountError("")).to.include("must match pattern");
    expect(getAmountError("all")).to.include("must match pattern");
  });

  it("should get asset errors", async () => {
    expect(getAssetError("ETH")).to.equal("");
    expect(getAssetError("")).to.include("must match pattern");
  });

  it("should get dateTime errors", async () => {
    expect(getDateTimeError("2020-01-01T00:00:00Z")).to.equal("");
    expect(getDateTimeError("")).to.include("must match format");
  });

  it("should get date errors", async () => {
    expect(getDateError("2020-01-01")).to.equal("");
    expect(getDateError("")).to.include("must match format");
    expect(getDateError("2020-01-01T00:00:00Z")).to.include("must match format");
  });

  it("should get TxId errors", async () => {
    expect(getTxIdError("Ethereum/0xabc123")).to.equal("");
    expect(getTxIdError("Ethereum/0xabc123/123")).to.equal("");
    expect(getTxIdError("")).to.include("must match pattern");
  });

});

