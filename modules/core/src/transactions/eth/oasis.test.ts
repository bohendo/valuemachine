import {
  AddressCategories,
  Transactions,
  TransactionSources,
  TransferCategories,
} from "@finances/types";
import { expect } from "@finances/utils";

import {
  getRealChainData,
  getTestAddressBook,
  testLogger,
} from "../../testing";
import { getTransactions } from "../index";

const log = testLogger.child({ module: "TestTransactions" });

describe(TransactionSources.Oasis, () => {
  let txns: Transactions;
  let addressBook;

  beforeEach(() => {
    addressBook = getTestAddressBook();
    txns = getTransactions({ addressBook, logger: log });
    expect(txns.json.length).to.equal(0);
  });

  it("should handle a v1 buy", async () => {
    const selfAddress = "0x213fe7e177160991829a4d0a598a848d2448f384";
    const txHash = "0x5e15f70d656308e72be1d0772dae4c275e7efdff2ab778f7ae4eaefede616e38";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(3);
    expect(tx.sources).to.include(TransactionSources.Oasis);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include(TransactionSources.Oasis);
    const base = tx.transfers[0];
    expect(base.category).to.equal(TransferCategories.Expense);
    const swapOut = tx.transfers[1];
    expect(swapOut.category).to.equal(TransferCategories.SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle a v1 sell", async () => {
    const selfAddress = "0x0005abcbb9533cf6f9370505ffef25393e0d2852";
    const txHash = "0x5e15f70d656308e72be1d0772dae4c275e7efdff2ab778f7ae4eaefede616e38";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(1);
    expect(tx.sources).to.include(TransactionSources.Oasis);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include(TransactionSources.Oasis);
    const swapIn = tx.transfers[0];
    expect(swapIn.category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle a swap via proxy", async () => {
    const selfAddress = "0xada083a3c06ee526f827b43695f2dcff5c8c892b";
    const txHash = "0x7c1a36431b0fd001f20277850f16226a44ce1b83db89d0572a7e9289cbcc7c3b";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(2);
    expect(tx.sources).to.include(TransactionSources.Oasis);
    const swapOut = tx.transfers[0];
    expect(swapOut.category).to.equal(TransferCategories.SwapOut);
    const swapIn = tx.transfers[1];
    expect(swapIn.category).to.equal(TransferCategories.SwapIn);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include(TransactionSources.Oasis);
  });

});

