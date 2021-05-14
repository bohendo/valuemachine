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

const log = testLogger.child({ module: `Test${TransactionSources.Uniswap}` });

describe(TransactionSources.Uniswap, () => {
  let txns: Transactions;
  let addressBook;

  beforeEach(() => {
    addressBook = getTestAddressBook();
    txns = getTransactions({ addressBook, logger: log });
    expect(txns.json.length).to.equal(0);
  });

  it("should handle a v1 swap", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x25e3f8798ff7f1e85f1ee5479d8e74c861ca97963a8356c9c6b7a6505b007423";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    chainData.merge({ transactions: [], tokens: {}, addresses: {}, calls: [{
      block: 8585441,
      contractAddress: "0x0000000000000000000000000000000000000000",
      from: "0x09cabec1ead1c0ba254b09efb3ee13841712be14",
      hash: "0x25e3f8798ff7f1e85f1ee5479d8e74c861ca97963a8356c9c6b7a6505b007423",
      timestamp: "2019-09-20T09:48:47.000Z",
      to: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      value: "7.139681444502334347"
    }] });
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(3);
    expect(tx.sources).to.include(TransactionSources.Uniswap);
    const base = tx.transfers[0];
    expect(base.category).to.equal(TransferCategories.Expense);
    const swapOut = tx.transfers[1];
    expect(swapOut.category).to.equal(TransferCategories.SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.category).to.equal(TransferCategories.SwapIn);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include(TransactionSources.Uniswap);
  });

  it("should handle a v2 swap", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x5d43e5c81730b55e4bb506768e79593099502ad7e2e9ef0a43da2d88ba4e937a";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    chainData.merge({ transactions: [], tokens: {}, addresses: {}, calls: [{
      block: 10889902,
      contractAddress: "0x0000000000000000000000000000000000000000",
      from: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
      hash: "0x5d43e5c81730b55e4bb506768e79593099502ad7e2e9ef0a43da2d88ba4e937a",
      timestamp: "2020-09-19T02:17:03.000Z",
      to: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      value: "0.705704103459495063"
    }] });
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.transfers.length).to.equal(3);
    expect(tx.sources).to.include(TransactionSources.Uniswap);
    const base = tx.transfers[0];
    expect(base.category).to.equal(TransferCategories.Expense);
    const swapOut = tx.transfers[1];
    expect(swapOut.category).to.equal(TransferCategories.SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.category).to.equal(TransferCategories.SwapIn);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include(TransactionSources.Uniswap);
  });

});


