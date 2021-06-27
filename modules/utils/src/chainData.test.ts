import { AddressZero, HashZero } from "@ethersproject/constants";

import { getChainDataError } from "./chainData";
import { expect } from "./testUtils";

const validAddressHistory = {
  [AddressZero]: {
    history: [HashZero],
    lastUpdated: new Date(0).toISOString(),
  },
};

const validEthCall = {
  hash: HashZero,
  block: 0,
  from: AddressZero,
  to: AddressZero,
  timestamp: new Date(0).toISOString(),
  value: "0",
};

const validEthTx = {
  hash: HashZero,
  block: 0,
  data: "0x",
  from: AddressZero,
  to: AddressZero,
  gasLimit: "0x",
  gasPrice: "0x",
  gasUsed: "0x",
  index: 0,
  logs: [{
    address: AddressZero,
    data: HashZero,
    index: 0,
    topics: [HashZero],
  }],
  nonce: 0,
  timestamp: new Date(0).toISOString(),
  value: "0",
};

const validChainData = {
  addresses: validAddressHistory,
  transactions: [validEthTx],
  calls: [validEthCall],
};

describe("ChainData", () => {

  it("should return no errors if json is valid", async () => {
    expect(getChainDataError(validChainData)).to.be.null;
  });

  it("should return an error if an eth tx is invalid", async () => {
    expect(getChainDataError({
      ...validChainData,
      transactions: [{ ...validEthTx, block: "0" }],
    })).to.be.a("string");
  });

  it("should return an error if an eth call is invalid", async () => {
    expect(getChainDataError({
      ...validChainData,
      calls: [{ ...validEthCall, hash: AddressZero }],
    })).to.be.a("string");
  });

  it("should return an error if an address history entry is invalid", async () => {
    expect(getChainDataError({
      ...validChainData,
      addresses: { ...validAddressHistory, lastUpdated: undefined },
    })).to.be.a("string");
  });

});

