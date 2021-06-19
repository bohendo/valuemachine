import {
  AddressCategories,
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";

import { parseEthTx } from "../parser";
import {
  expect,
  testLogger,
  getRealChainData,
  getTestAddressBook,
} from "../testUtils";

const source = TransactionSources.Oasis;
const { Expense, SwapIn, SwapOut } = TransferCategories;
const log = testLogger.child({
  // level: "debug",
  module: "TestTransactions",
});

describe(source, () => {
  let addressBook;

  beforeEach(() => {
    addressBook = getTestAddressBook();
  });

  it("should handle a v1 buy", async () => {
    const selfAddress = "0x213fe7e177160991829a4d0a598a848d2448f384";
    const txHash = "0x5e15f70d656308e72be1d0772dae4c275e7efdff2ab778f7ae4eaefede616e38";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    const tx = parseEthTx(chainData.json.transactions[0], addressBook, chainData, log);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.sources).to.include(source);
    const base = tx.transfers[0];
    expect(base.category).to.equal(Expense);
    const swapOut = tx.transfers[1];
    expect(swapOut.category).to.equal(SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.category).to.equal(SwapIn);
  });

  it("should handle a v1 sell", async () => {
    const selfAddress = "0x0005abcbb9533cf6f9370505ffef25393e0d2852";
    const txHash = "0x5e15f70d656308e72be1d0772dae4c275e7efdff2ab778f7ae4eaefede616e38";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    const tx = parseEthTx(chainData.json.transactions[0], addressBook, chainData, log);
    expect(tx.transfers.length).to.equal(1);
    expect(tx.sources).to.include(source);
    const swapIn = tx.transfers[0];
    expect(swapIn.category).to.equal(SwapIn);
  });

  it("should handle a swap via proxy", async () => {
    const selfAddress = "0xada083a3c06ee526f827b43695f2dcff5c8c892b";
    const txHash = "0x7c1a36431b0fd001f20277850f16226a44ce1b83db89d0572a7e9289cbcc7c3b";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    const tx = parseEthTx(chainData.json.transactions[0], addressBook, chainData, log);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.sources).to.include(source);
    const swapOut = tx.transfers[1];
    expect(swapOut.category).to.equal(SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.category).to.equal(SwapIn);
  });

});

