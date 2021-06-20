import {
  AddressCategories,
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";

import { parseEthTx } from "../parser";
import {
  getRealChainData,
  getTestAddressBook,
  expect,
  testLogger,
} from "../testUtils";

const source = TransactionSources.Compound;
const { Income, Deposit, Withdraw, SwapIn, SwapOut, Borrow, Repay } = TransferCategories;
const log = testLogger.child({
  // level: "debug",
  module: `Test${source}`,
});

describe(source, () => {
  let addressBook;

  beforeEach(() => {
    addressBook = getTestAddressBook();
  });

  it("should handle deposits to comound v1", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x4bd1cb92d370a3b69b697e606e905d76a003b28c1605d2e46c9a887202b72ae0";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    const tx = parseEthTx(chainData.json.transactions[0], addressBook, chainData, log);
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(2);
    const deposit = tx.transfers[1];
    expect(deposit.category).to.equal(Deposit);
  });

  it("should handle withdrawals from comound v1", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x1ebdcb2989fe980c40bbce3e68a9d74832ab67a4a0ded2be503ec61335e4bad6";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    const tx = parseEthTx(chainData.json.transactions[0], addressBook, chainData, log);
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(3);
    const income = tx.transfers[1];
    expect(income.category).to.equal(Income);
    const withdraw = tx.transfers[2];
    expect(withdraw.category).to.equal(Withdraw);
  });

  it("should handle deposits to compound v2", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x1e17fdbe0dece46ad08ba84fd624072659684b354642d37b05b457108cea6f63";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    const tx = parseEthTx(chainData.json.transactions[0], addressBook, chainData, log);
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(3);
    const deposit = tx.transfers[1];
    expect(deposit.category).to.equal(SwapOut);
    const cToken = tx.transfers[2];
    expect(cToken.category).to.equal(SwapIn);
  });

  it("should handle withdrawals from compound v2", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x9105678815630bf456b4af5e13de9e5e970e25bb3a8849a74953d833d2a9e499";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    const tx = parseEthTx(chainData.json.transactions[0], addressBook, chainData, log);
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(3);
    const withdraw = tx.transfers[1];
    expect(withdraw.category).to.equal(SwapIn);
    const cToken = tx.transfers[2];
    expect(cToken.category).to.equal(SwapOut);
  });

  it("should handle compound v2 market entries", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x998aedf25aeb6657ffd1d16dbff963a41a20ea42fd6740264b9f492fe0623eea";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    const tx = parseEthTx(chainData.json.transactions[0], addressBook, chainData, log);
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(1);
  });

  it("should handle borrows from compound v2", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x032e9d84b07fdd3e546b44b4fa034d1b470e927188df9594af7e5d656588aad0";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    chainData.merge({ transactions: [], addresses: {}, tokens: {}, calls: [{
      block: 8354702,
      contractAddress: "0x0000000000000000000000000000000000000000",
      from: "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5",
      hash: "0x032e9d84b07fdd3e546b44b4fa034d1b470e927188df9594af7e5d656588aad0",
      timestamp: "2019-08-15T10:58:33.000Z",
      to: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      value: "1.0"
    }] });
    const tx = parseEthTx(chainData.json.transactions[0], addressBook, chainData, log);
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(2);
    const borrow = tx.transfers[1];
    expect(borrow.category).to.equal(Borrow);
  });

  it("should handle repayments to compound v2", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0xdee8b8c866b692e4c196454630b06eee59f86250afa3419b2d5e8a07971946ae";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    const tx = parseEthTx(chainData.json.transactions[0], addressBook, chainData, log);
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(2);
    const repay = tx.transfers[1];
    expect(repay.category).to.equal(Repay);
  });

});

