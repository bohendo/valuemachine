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
} from "../testing";
import { getTransactions } from "../index";

const log = testLogger.child({ module: `Test${TransactionSources.Compound}` });

describe(TransactionSources.Compound, () => {
  let addressBook;
  let txns: Transactions;

  beforeEach(() => {
    addressBook = getTestAddressBook();
    txns = getTransactions({ addressBook, logger: log });
  });

  it("should handle deposits to comound v1", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x4bd1cb92d370a3b69b697e606e905d76a003b28c1605d2e46c9a887202b72ae0";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.sources).to.include(TransactionSources.Compound);
    expect(tx.transfers.length).to.equal(2);
    const deposit = tx.transfers[1];
    expect(deposit.category).to.equal(TransferCategories.Deposit);
    expect(tx.description).to.include("deposit");
    expect(tx.description).to.include(math.round(deposit.quantity));
    expect(tx.description).to.include(addressBook.getName(selfAddress));
  });

  it("should handle withdrawals from comound v1", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x1ebdcb2989fe980c40bbce3e68a9d74832ab67a4a0ded2be503ec61335e4bad6";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.sources).to.include(TransactionSources.Compound);
    expect(tx.transfers.length).to.equal(2);
    const withdraw = tx.transfers[1];
    expect(withdraw.category).to.equal(TransferCategories.Withdraw);
    expect(tx.description).to.include("withdr");
    expect(tx.description).to.include(math.round(withdraw.quantity));
    expect(tx.description).to.include(addressBook.getName(selfAddress));
  });

  it("should handle deposits to compound v2", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x1e17fdbe0dece46ad08ba84fd624072659684b354642d37b05b457108cea6f63";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    chainData.merge({ transactions: [], tokens: {
      ["0x5d3a536e4d6dbd6114cc1ead35777bab948e3643"]: {
        decimals: 8,
        name: "Compound Dai",
        symbol: "cDAI"
      },
    }, addresses: {}, calls: [] });
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.sources).to.include(TransactionSources.Compound);
    expect(tx.transfers.length).to.equal(3);
    const deposit = tx.transfers[1];
    expect(deposit.category).to.equal(TransferCategories.SwapOut);
    const cToken = tx.transfers[2];
    expect(cToken.category).to.equal(TransferCategories.SwapIn);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include("deposit");
    expect(tx.description).to.include(math.round(deposit.quantity));
    expect(tx.description).to.include(deposit.assetType);
  });

  it("should handle withdrawals from compound v2", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x9105678815630bf456b4af5e13de9e5e970e25bb3a8849a74953d833d2a9e499";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    chainData.merge({ transactions: [], tokens: {
      ["0x5d3a536e4d6dbd6114cc1ead35777bab948e3643"]: {
        decimals: 8,
        name: "Compound Dai",
        symbol: "cDAI"
      },
    }, addresses: {}, calls: [] });
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.sources).to.include(TransactionSources.Compound);
    expect(tx.transfers.length).to.equal(3);
    const withdraw = tx.transfers[1];
    expect(withdraw.category).to.equal(TransferCategories.SwapIn);
    const cToken = tx.transfers[2];
    expect(cToken.category).to.equal(TransferCategories.SwapOut);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include("withdr");
    expect(tx.description).to.include(math.round(withdraw.quantity));
    expect(tx.description).to.include(withdraw.assetType);
  });

  it("should handle compound v2 market entries", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x998aedf25aeb6657ffd1d16dbff963a41a20ea42fd6740264b9f492fe0623eea";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.sources).to.include(TransactionSources.Compound);
    expect(tx.transfers.length).to.equal(1);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include("enter");
  });

  it("should handle borrows from compound v2", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x032e9d84b07fdd3e546b44b4fa034d1b470e927188df9594af7e5d656588aad0";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    chainData.merge({ transactions: [], tokens: {
      ["0x5d3a536e4d6dbd6114cc1ead35777bab948e3643"]: {
        decimals: 8,
        name: "Compound Dai",
        symbol: "cDAI"
      },
    }, addresses: {}, calls: [{
      block: 8354702,
      contractAddress: "0x0000000000000000000000000000000000000000",
      from: "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5",
      hash: "0x032e9d84b07fdd3e546b44b4fa034d1b470e927188df9594af7e5d656588aad0",
      timestamp: "2019-08-15T10:58:33.000Z",
      to: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      value: "1.0"
    }] });
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.sources).to.include(TransactionSources.Compound);
    expect(tx.transfers.length).to.equal(2);
    const borrow = tx.transfers[1];
    expect(borrow.category).to.equal(TransferCategories.Borrow);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include("borrow");
    expect(tx.description).to.include(math.round(borrow.quantity));
    expect(tx.description).to.include(borrow.assetType);
  });

  it("should handle repayments to compound v2", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0xdee8b8c866b692e4c196454630b06eee59f86250afa3419b2d5e8a07971946ae";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    chainData.merge({ transactions: [], tokens: {
      ["0x5d3a536e4d6dbd6114cc1ead35777bab948e3643"]: {
        decimals: 8,
        name: "Compound Dai",
        symbol: "cDAI"
      },
    }, addresses: {}, calls: [] });
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.sources).to.include(TransactionSources.Compound);
    expect(tx.transfers.length).to.equal(1);
    const repay = tx.transfers[0];
    expect(repay.category).to.equal(TransferCategories.Repay);
    expect(tx.description).to.include(addressBook.getName(selfAddress));
    expect(tx.description).to.include("repay");
    expect(tx.description).to.include(math.round(repay.quantity));
    expect(tx.description).to.include(repay.assetType);
  });

});

