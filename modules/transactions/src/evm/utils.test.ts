import { expect } from "chai";
import { AddressZero, HashZero } from "@ethersproject/constants";

import { getEvmDataError } from "./utils";

const validAddressHistory = {
  [AddressZero]: {
    history: [HashZero],
    lastUpdated: new Date(0).toISOString(),
  },
};

const validEthTx = {
  hash: HashZero,
  from: AddressZero,
  to: AddressZero,
  gasPrice: "100",
  gasUsed: "100",
  logs: [{
    address: AddressZero,
    data: HashZero,
    index: 0,
    topics: [HashZero],
  }],
  nonce: 0,
  timestamp: new Date(0).toISOString(),
  transfers: [{
    from: AddressZero,
    to: AddressZero,
    value: "0",
  }],
  value: "0",
};

const validEvmData = {
  addresses: validAddressHistory,
  transactions: {
    [validEthTx.hash]: validEthTx,
  },
};

describe("EvmData", () => {

  it("should return no errors if json is valid", async () => {
    expect(getEvmDataError(validEvmData)).to.equal("");
  });

  it("should return an error if an eth tx is invalid", async () => {
    expect(getEvmDataError({
      ...validEvmData,
      transactions: { [validEthTx.hash]: { ...validEthTx, gasPrice: 0 } },
    })).to.be.a("string");
  });

  it("should return an error if an address history entry is invalid", async () => {
    expect(getEvmDataError({
      ...validEvmData,
      addresses: { ...validAddressHistory, lastUpdated: undefined },
    })).to.be.a("string");
  });

});
