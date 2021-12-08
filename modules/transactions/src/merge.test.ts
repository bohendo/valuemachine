import { HashZero } from "@ethersproject/constants";

import { Assets, Guards, Methods, Sources, TransferCategories } from "./enums";
import { mergeTransaction } from "./merge";
import { expect, testLogger } from "./testUtils";
import { Transaction } from "./types";

const log = testLogger.child({ module: "TestMerge" }, { level: "warn" });
const { ETH } = Assets;
const { Fee, Expense, Internal } = TransferCategories;
const { Coinbase, Ethereum } = Sources;
const csvSource = Coinbase;

const ethAccount = "Ethereum/0x1111111111111111111111111111111111111111";
const extAccount = "Ethereum/0x2222222222222222222222222222222222222222";
const timestamp = "2018-01-02T01:00:00Z";
const value = "1.3141592653589793";

const getCsvTx = (): Transaction => ({
  // The csv date can be off slightly from the eth tx date
  date: timestamp, // new Date(new Date(timestamp).getTime() + (1000 * 60 * 15)).toISOString(),
  sources: [csvSource],
  method: Methods.Deposit,
  uuid: `${csvSource}/${timestamp}`,
  transfers: [
    {
      asset: ETH,
      category: Internal,
      from: "Ethereum/default",
      amount: value.substring(0, 10),
      to: `USA/${csvSource}/account`
    }
  ],
  index: 2
});

const getEthTx = (): Transaction => ({
  date: timestamp,
  uuid: `${Ethereum}/${HashZero}`,
  sources: [Ethereum],
  transfers: [
    {
      asset: ETH,
      category: Fee,
      from: ethAccount,
      index: -1,
      amount: "0.000000004294967296",
      to: Guards.Ethereum,
    },
    {
      asset: ETH,
      category: Expense,
      from: ethAccount,
      index: 0,
      amount: value,
      to: extAccount,
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
    expect(tx.transfers[1].category).to.equal(Internal);
    expect(tx.transfers[1].to).to.include(csvSource);
    expect(tx.transfers[1].from).to.equal(ethAccount);
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
    expect(tx.transfers[1].category).to.equal(Internal);
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
