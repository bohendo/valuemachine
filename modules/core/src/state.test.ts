import {
  State,
  Transactions,
  Transaction,
} from "@finances/types";
import { math, expect } from "@finances/utils";

import { getState } from "./state";
import { AddressOne, getTestAddressBook, testLogger } from "./testing";
import { getTransactions } from "./transactions";

const log = testLogger.child({ module: "TestState" });

describe("State", () => {
  let addressBook;
  let state: State;
  let txns: Transactions;
  const amt = "100";
  const asset = "TEST";

  beforeEach(() => {
    addressBook = getTestAddressBook();

    txns = getTransactions({ addressBook, logger: log });
    expect(txns.json.length).to.equal(0);

    state = getState({ addressBook, logger: log });
    expect(Object.keys(state.getAllBalances()).length).to.equal(0);

    state.putChunk(AddressOne, {
      asset: asset,
      receiveDate: new Date().toISOString(),
      quantity: amt,
    });
    expect(Object.keys(state.getAllBalances()).length).to.equal(1);

  });

  it("should get an account's balance", async () => {
    const bal = state.getBalance(AddressOne, asset);
    expect(math.eq(bal, amt)).to.be.true;
  });

  it("should get a chunk", async () => {
    const testAmt = "3.14";
    const chunks = state.getChunks(
      AddressOne,
      asset,
      testAmt,
      { date: new Date().toISOString() } as Transaction,
    );
    log.info(chunks, "chunks");
    expect(chunks.length).to.equal(1);
    expect(chunks[0].asset).to.equal(asset);
    expect(chunks[0].quantity).to.equal(testAmt);
    expect(state.getBalance(AddressOne, asset)).to.equal(math.sub(amt, testAmt));
  });

});

