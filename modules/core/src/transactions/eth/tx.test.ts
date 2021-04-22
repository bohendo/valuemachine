import { AddressZero, HashZero } from "@ethersproject/constants";
import { ChainData, Transactions } from "@finances/types";
import { expect } from "@finances/utils";

import { AddressOne, AddressTwo, getTestChainData, testAddressBook, testLogger } from "../testing";
import { getTransactions } from "../index";

const log = testLogger.child({ module: "TestTransactions" });

describe("Merge chain data", () => {
  let txns: Transactions;
  let chainData: ChainData;

  beforeEach(() => {
    txns = getTransactions({ addressBook: testAddressBook, logger: log });
    chainData = getTestChainData([
      {
        block: 10,
        data: "0x",
        from: AddressOne,
        gasLimit: "0x100000",
        gasPrice: "0x100000",
        gasUsed: "0x1000",
        hash: HashZero,
        index: 1,
        logs: [],
        nonce: 0,
        status: 1,
        timestamp: "2000-01-01T00:00:00.000Z",
        to: AddressTwo,
        value: "0.2",
      },
    ], [
      {
        block: 10,
        contractAddress: AddressZero,
        from: AddressZero,
        hash: HashZero,
        timestamp: "2000-01-01T01:00:00.000Z",
        to: AddressOne,
        value: "0.4"
      },
      {
        block: 10,
        contractAddress: AddressZero,
        from: AddressOne,
        hash: HashZero,
        timestamp: "2000-01-01T01:00:00.000Z",
        to: AddressTwo,
        value: "0.1"
      },
      {
        block: 10,
        contractAddress: AddressZero,
        from: AddressOne,
        hash: HashZero,
        timestamp: "2000-01-01T01:00:00.000Z",
        to: AddressTwo,
        value: "0.1"
      },
    ]);
  });

  it("should merge chain data successfully", async () => {
    expect(txns.json.length).to.equal(0);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    expect(txns.json[0].transfers.length).to.equal(4);
  });

  it("should merge chain data multiple times without creaing duplicates", async () => {
    expect(txns.json.length).to.equal(0);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    expect(txns.json[0].transfers.length).to.equal(4);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    expect(txns.json[0].transfers.length).to.equal(4);
  });

});
