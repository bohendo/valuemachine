import { AddressZero, HashZero } from "@ethersproject/constants";
import {
  Assets,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@finances/types";
import { expect } from "@finances/utils";

import { AddressOne, AddressThree, testLogger } from "../testing";

import { mergeTransaction } from "./merge";

const { ETH } = Assets;
const { Expense, Deposit } = TransferCategories;
const { Coinbase, EthTx } = TransactionSources;
const log = testLogger.child({
  // level: "debug",
  module: "TestTransactions",
});

const timestamp = "2018-01-02T01:00:00Z";
const value = "1.3141592653589793";

const getExternalTx = (): Transaction => ({
  // The external date can be off slightly from the eth tx date
  date: timestamp, // new Date(new Date(timestamp).getTime() + (1000 * 60 * 15)).toISOString(),
  sources: [Coinbase],
  tags: [],
  transfers: [
    {
      asset: ETH,
      category: Deposit,
      from: "external-account",
      quantity: value.substring(0, 10),
      to: "coinbase-account"
    }
  ],
  description: "Deposited 1.31 ETH into coinbase",
  index: 2
});

const getEthTx = (): Transaction => ({
  date: timestamp,
  hash: HashZero,
  sources: [EthTx],
  tags: [],
  transfers: [
    {
      asset: ETH,
      category: Expense,
      from: AddressOne,
      index: -1,
      quantity: "0.000000004294967296",
      to: AddressZero,
    },
    {
      asset: ETH,
      category: Expense,
      from: AddressOne,
      index: 0,
      quantity: value,
      to: AddressThree,
    }
  ],
  description: "test-self-1 transfered 1.3142 ETH to test-3",
});

describe("Merge", () => {
  let txns: Transaction[];

  beforeEach(() => {
    txns = [];
  });

  it("should merge an external tx into an eth tx", async () => {
    txns.push(getEthTx());
    mergeTransaction(txns, getExternalTx(), log);
    expect(txns.length).to.equal(1);
    const tx = txns[0];
    expect(tx.sources).to.include(Coinbase);
    expect(tx.sources).to.include(EthTx);
    expect(tx.transfers[1].category).to.equal(Deposit);
  });

  it("should not insert a duplicate external tx into an already merged tx list", async () => {
    txns.push(getEthTx());
    mergeTransaction(txns, getExternalTx(), log);
    expect(txns.length).to.equal(1);
    mergeTransaction(txns, getExternalTx(), log);
    expect(txns.length).to.equal(1);
  });

  it("should merge an eth tx into an external tx", async () => {
    txns.push(getExternalTx());
    mergeTransaction(txns, getEthTx(), log);
    expect(txns.length).to.equal(1);
    const tx = txns[0];
    expect(tx.sources).to.include(Coinbase);
    expect(tx.sources).to.include(EthTx);
    expect(tx.transfers[1].category).to.equal(Deposit);
  });

  it("should not insert a duplicate eth tx into an already merged tx list", async () => {
    txns.push(getExternalTx());
    mergeTransaction(txns, getEthTx(), log);
    expect(txns.length).to.equal(1);
    mergeTransaction(txns, getEthTx(), log);
    expect(txns.length).to.equal(1);
  });

});