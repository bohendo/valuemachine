// import { AddressZero } from "@ethersproject/constants";
import {
  Prices,
  State,
  Transactions,
  Transaction,
} from "@finances/types";
import { math, expect } from "@finances/utils";

import { getPrices } from "./prices";
import { getState } from "./state";
import { AddressOne, getTestAddressBook, testLogger } from "./testing";
import { getTransactions } from "./transactions";

const log = testLogger.child({ module: "TestState" });

describe("State", () => {
  let addressBook;
  let prices: Prices;
  let state: State;
  let txns: Transactions;
  const amt = "100";
  const asset = "TEST";

  beforeEach(() => {
    addressBook = getTestAddressBook();

    txns = getTransactions({ addressBook, logger: log });
    expect(txns.json.length).to.equal(0);

    prices = getPrices({ logger: log });
    expect(Object.keys(prices.json).length).to.equal(0);

    state = getState({ addressBook, prices, logger: log });
    expect(Object.keys(state.getAllBalances()).length).to.equal(0);

    state.putChunk(AddressOne, {
      asset: asset,
      dateRecieved: new Date().toISOString(),
      purchasePrice: "1.02",
      quantity: amt,
    });
    expect(Object.keys(state.getAllBalances()).length).to.equal(1);

  });

  it("should get all balances", async () => {
    const allBal = state.getAllBalances();
    expect(math.eq(allBal[AddressOne][asset], amt)).to.be.true;
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

