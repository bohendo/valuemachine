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
} from "../testing";
import { getTransactions } from "../index";

import { makerAddresses } from "./maker";

const log = testLogger.child({ module: "TestTransactions" });

describe(TransactionSources.Maker, () => {
  let txns: Transactions;
  const tubAddress = makerAddresses.find(e => e.name === "scd-tub").address;
  let addressBook;

  beforeEach(() => {
    addressBook = getTestAddressBook();
    txns = getTransactions({ addressBook, logger: log });
    expect(txns.json.length).to.equal(0);
  });

  it("should handle a SAI borrow", async () => {
    addressBook.newAddress(
      "0x213fe7e177160991829a4d0a598a848d2448f384",
      AddressCategories.Self,
      "test-self",
    );
    const chainData = await getRealChainData(
      "0x39ac4111ceaac95a9eee278b05ca38db3142a188bb33d5aa1c646546fc8d31c6"
    );
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Expense);
    expect(tx.transfers[0].to).to.equal(tubAddress);
  });

  it("should handle a PETH withdrawal with duplicate events", async () => {
    addressBook.newAddress(
      "0x213fe7e177160991829a4d0a598a848d2448f384",
      AddressCategories.Self,
      "test-self",
    );
    const chainData = await getRealChainData(
      "0x7c17ce64eb97ebb2e0322595a30fc50b296f9cec391c276410bf2d1a459ff9cf"
    );
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(2);
    const withdraw = tx.transfers[1];
    expect(withdraw.category).to.equal(TransferCategories.Withdraw);
  });

  it("should handle a SAI repayment", async () => {
    addressBook.newAddress(
      "0x213fe7e177160991829a4d0a598a848d2448f384",
      AddressCategories.Self,
      "test-self",
    );
    const chainData = await getRealChainData(
      "0xce0ac042673100eb6ad329a5996aa52c43d1f882a0d93bb5607c5a6d27b1014a"
    );
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(3);
    const repay = tx.transfers[1];
    expect(repay.category).to.equal(TransferCategories.Repay);
  });

  // TODO: add the associated internal eth transfer
  it("should handle a SAI cashout", async () => {
    addressBook.newAddress(
      "0x50509324beedeaf5ae19186a6cc2c30631a98d97",
      AddressCategories.Self,
      "test-self",
    );
    const chainData = await getRealChainData(
      "0xa2920b7319c62fa7d2bf5072a292972fe74af5f452d905495da1fb0d28bba86b"
    );
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(2);
    const swapOut = tx.transfers[1];
    expect(swapOut.category).to.equal(TransferCategories.SwapOut);
  });

  it("should handle a SAI to DAI migration", async () => {
    addressBook.newAddress(
      "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      AddressCategories.Self,
      "test-self",
    );
    const chainData = await getRealChainData(
      "0x20de49f7742cd25eaa75b4d09158f45b72ff7d847a250b4b60c9f33ac00bd759"
    );
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(3);
    const swapOut = tx.transfers[1];
    expect(swapOut.category).to.equal(TransferCategories.SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.category).to.equal(TransferCategories.SwapIn);
  });

});
