import {
  AddressCategories,
  Transactions,
  TransactionSources,
  TransferCategories,
} from "@finances/types";
import { math, expect } from "@finances/utils";

import {
  getRealChainData,
  getTestAddressBook,
  testLogger,
} from "../../testing";
import { getTransactions } from "../index";

const { Expense, Deposit, Withdraw, SwapIn, SwapOut, Borrow, Repay } = TransferCategories;
const log = testLogger.child({
  // level: "debug",
  module: "TestTransactions",
});

describe(TransactionSources.Maker, () => {
  let txns: Transactions;
  let addressBook;

  beforeEach(() => {
    addressBook = getTestAddressBook();
    txns = getTransactions({ addressBook, logger: log });
    expect(txns.json.length).to.equal(0);
  });

  it("should handle a WETH to PETH swap", async () => {
    const selfAddress = "0x213fe7e177160991829a4d0a598a848d2448f384";
    const txHash = "0x25441cec88c76e0f3a00b9ecbcc803f8cd8aff9de358e39c6b3f44dfdafd2aed";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(3);
    const swapOut = tx.transfers[1];
    expect(swapOut.category).to.equal(SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.category).to.equal(SwapIn);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include("swap");
    expect(tx.description).to.include(math.round(swapIn.quantity));
    expect(tx.description).to.include(swapIn.asset);
    expect(tx.description).to.include(math.round(swapOut.quantity));
    expect(tx.description).to.include(swapOut.asset);
  });

  it("should handle a PETH withdrawal with duplicate events", async () => {
    const selfAddress = "0x213fe7e177160991829a4d0a598a848d2448f384";
    const txHash = "0x7c17ce64eb97ebb2e0322595a30fc50b296f9cec391c276410bf2d1a459ff9cf";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(2);
    const withdraw = tx.transfers[1];
    expect(withdraw.category).to.equal(Withdraw);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include("withdr");
    expect(tx.description).to.include(math.round(withdraw.quantity));
  });

  it("should handle a SAI borrow", async () => {
    const selfAddress = "0x213fe7e177160991829a4d0a598a848d2448f384";
    const txHash = "0x39ac4111ceaac95a9eee278b05ca38db3142a188bb33d5aa1c646546fc8d31c6";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(2);
    const borrow = tx.transfers[1];
    expect(borrow.category).to.equal(Borrow);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include("borrow");
    expect(tx.description).to.include(math.round(borrow.quantity));
  });

  it("should handle a SAI repayment", async () => {
    const selfAddress = "0x213fe7e177160991829a4d0a598a848d2448f384";
    const txHash = "0xce0ac042673100eb6ad329a5996aa52c43d1f882a0d93bb5607c5a6d27b1014a";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(3);
    const repay = tx.transfers[1];
    expect(repay.category).to.equal(Repay);
    const fee = tx.transfers[2];
    expect(fee.category).to.equal(Expense);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include("repay");
    expect(tx.description).to.include(math.round(repay.quantity));
  });

  it("should handle a SAI cage cashout", async () => {
    const selfAddress = "0x50509324beedeaf5ae19186a6cc2c30631a98d97";
    const txHash = "0xa2920b7319c62fa7d2bf5072a292972fe74af5f452d905495da1fb0d28bba86b";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    chainData.merge({ transactions: [], tokens: {}, addresses: {}, calls: [{
      block: 12099407,
      contractAddress: "0x0000000000000000000000000000000000000000",
      from: "0x9fdc15106da755f9ffd5b0ba9854cfb89602e0fd",
      hash: "0xa2920b7319c62fa7d2bf5072a292972fe74af5f452d905495da1fb0d28bba86b",
      timestamp: "2021-03-24T04:14:59.000Z",
      to: "0x50509324beedeaf5ae19186a6cc2c30631a98d97",
      value: "0.052855519437617299"
    }] });
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(3);
    const swapOut = tx.transfers[1];
    expect(swapOut.category).to.equal(SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.category).to.equal(SwapIn);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include("redeem");
    expect(tx.description).to.include(math.round(swapIn.quantity));
    expect(tx.description).to.include(swapIn.asset);
    expect(tx.description).to.include(math.round(swapOut.quantity));
    expect(tx.description).to.include(swapOut.asset);
  });

  it("should handle a SAI to DAI migration", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x20de49f7742cd25eaa75b4d09158f45b72ff7d847a250b4b60c9f33ac00bd759";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(3);
    const swapOut = tx.transfers[1];
    expect(swapOut.category).to.equal(SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.category).to.equal(SwapIn);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include("migrat");
    expect(tx.description).to.include(math.round(swapIn.quantity));
    expect(tx.description).to.include(swapIn.asset);
    expect(tx.description).to.include(swapOut.asset);
  });

  it("should handle a DAI deposit to DSR", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const proxyAddress = "0x4e7433b5b1907b2140df8cb387f9699ddcd9059b";
    const txHash = "0x622431660cb6ee607e12ad077c8bf9f83f5f8cf495dbc919d55e9edcaebe22e0";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    addressBook.newAddress(proxyAddress, AddressCategories.Proxy, "cdp-proxy");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(2);
    const deposit = tx.transfers[1];
    expect(deposit.category).to.equal(Deposit);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include("deposit");
    expect(tx.description).to.include(math.round(deposit.quantity));
    expect(tx.description).to.include(deposit.asset);
  });

});
