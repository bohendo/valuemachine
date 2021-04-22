import { Transactions } from "@finances/types";
import { expect } from "@finances/utils";
import { AddressZero } from "@ethersproject/constants";

import { getAddressBook } from "../addressBook";

import { getFakeChainData, testLogger } from "./testing";

import { getTransactions } from "./index";

const log = testLogger.child({ module: "TestTransactions" });

describe("transactions merge", () => {
  const addressBook = getAddressBook(
    [{ name: "test", category: "self", address: AddressZero }],
    log
  );
  let txns: Transactions;

  beforeEach(() => {
    txns = getTransactions({ addressBook, logger: log });
  });

  it("should merge chain data multiple times without creaing duplicates", async () => {
    expect(txns.getAll().length).to.equal(0);
    txns.mergeChainData(getFakeChainData());
    expect(txns.getAll().length).to.equal(1);
    txns.mergeChainData(getFakeChainData());
    expect(txns.getAll().length).to.equal(1);
  });

});
