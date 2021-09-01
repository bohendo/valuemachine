import { HashZero } from "@ethersproject/constants";
import {
  Transaction,
  TransferCategories,
} from "@valuemachine/types";

import { Assets, Guards, TransactionSources } from "./enums";
import { mergeTransaction } from "./merge";
import {
  expect,
  testLogger,
} from "./testUtils";

const { ETH } = Assets;
const { Expense, Deposit } = TransferCategories;
const { Coinbase, Ethereum } = TransactionSources;
const csvSource = Coinbase;
const log = testLogger.child({ module: "TestMerge" }, {
  // level: "debug",
});

const AddressOne = "0x1111111111111111111111111111111111111111";
const AddressTwo = "0x2222222222222222222222222222222222222222";
const timestamp = "2018-01-02T01:00:00Z";
const value = "1.3141592653589793";

const getCsvTx = (): Transaction => ({
  // The csv date can be off slightly from the eth tx date
  date: timestamp, // new Date(new Date(timestamp).getTime() + (1000 * 60 * 15)).toISOString(),
  sources: [csvSource],
  transfers: [
    {
      asset: ETH,
      category: Deposit,
      from: "ETH-account",
      quantity: value.substring(0, 10),
      to: `${csvSource}-account`
    }
  ],
  index: 2
});

const getEthTx = (): Transaction => ({
  date: timestamp,
  hash: HashZero,
  sources: [Ethereum],
  transfers: [
    {
      asset: ETH,
      category: Expense,
      from: AddressOne,
      index: -1,
      quantity: "0.000000004294967296",
      to: Guards.Ethereum,
    },
    {
      asset: ETH,
      category: Expense,
      from: AddressOne,
      index: 0,
      quantity: value,
      to: AddressTwo,
    }
  ],
});

describe("Merge", () => {
  let txns: Transaction[];

  beforeEach(() => {
    txns = [];
  });

  it("should merge a csv tx into an eth tx", async () => {
    txns.push(getEthTx());
    mergeTransaction(txns, getCsvTx(), log);
    expect(txns.length).to.equal(1);
    const tx = txns[0];
    expect(tx.sources).to.include(csvSource);
    expect(tx.sources).to.include(Ethereum);
    expect(tx.transfers[1].category).to.equal(Deposit);
    expect(tx.transfers[1].to).to.include(csvSource);
  });

  it("should not insert a duplicate csv tx into an already merged tx list", async () => {
    txns.push(getEthTx());
    mergeTransaction(txns, getCsvTx(), log);
    expect(txns.length).to.equal(1);
    mergeTransaction(txns, getCsvTx(), log);
    expect(txns.length).to.equal(1);
  });

  it("should merge an eth tx into an csv tx", async () => {
    txns.push(getCsvTx());
    mergeTransaction(txns, getEthTx(), log);
    expect(txns.length).to.equal(1);
    const tx = txns[0];
    expect(tx.sources).to.include(csvSource);
    expect(tx.sources).to.include(Ethereum);
    expect(tx.transfers[1].category).to.equal(Deposit);
    expect(tx.transfers[1].to).to.include(csvSource);
  });

  it("should not insert a duplicate eth tx into an already merged tx list", async () => {
    txns.push(getCsvTx());
    mergeTransaction(txns, getEthTx(), log);
    expect(txns.length).to.equal(1);
    mergeTransaction(txns, getEthTx(), log);
    expect(txns.length).to.equal(1);
  });

});
