import {
  AddressCategories,
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";

import { parseEthTx } from "../parser";
import {
  expect,
  getEthTx,
  getTestAddressBook,
  getTestEthCall,
  testLogger,
} from "../testUtils";

const source = TransactionSources.Uniswap;
const { Expense, SwapIn, SwapOut } = TransferCategories;
const log = testLogger.child({
  // level: "debug",
  module: `Test${source}`,
});

describe(source, () => {
  let addressBook;

  beforeEach(() => {
    addressBook = getTestAddressBook();
  });

  it("should handle a v1 swap", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x25e3f8798ff7f1e85f1ee5479d8e74c861ca97963a8356c9c6b7a6505b007423";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const tx = parseEthTx(await getEthTx(txHash), [getTestEthCall({
      from: "0x09cabec1ead1c0ba254b09efb3ee13841712be14",
      hash: txHash,
      to: selfAddress,
      value: "7.139681444502334347"
    })], addressBook, log);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.sources).to.include(source);
    const fee = tx.transfers[0];
    expect(fee.category).to.equal(Expense);
    const swapIn = tx.transfers[1];
    expect(swapIn.category).to.equal(SwapIn);
    const swapOut = tx.transfers[2];
    expect(swapOut.category).to.equal(SwapOut);
  });

  it("should handle a v2 swap", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x5d43e5c81730b55e4bb506768e79593099502ad7e2e9ef0a43da2d88ba4e937a";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const tx = parseEthTx(await getEthTx(txHash), [getTestEthCall({
      from: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
      hash: txHash,
      to: selfAddress,
      value: "0.705704103459495063"
    })], addressBook, log);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.sources).to.include(source);
    const fee = tx.transfers[0];
    expect(fee.category).to.equal(Expense);
    const swapIn = tx.transfers[1];
    expect(swapIn.category).to.equal(SwapIn);
    const swapOut = tx.transfers[2];
    expect(swapOut.category).to.equal(SwapOut);
  });

});


