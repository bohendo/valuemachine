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

describe.only(TransactionSources.Compound, () => {
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

  it("should handle withdraws from comound v1", async () => {
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

  // it("should handle borrows from compound v1", async () => {});
  // it("should handle repayments to compound v1", async () => {});

  // eg 0x1e17fdbe0dece46ad08ba84fd624072659684b354642d37b05b457108cea6f63
  it("should handle deposits to compound v2", async () => {
  });

  // eg 0x9105678815630bf456b4af5e13de9e5e970e25bb3a8849a74953d833d2a9e499
  // it("should handle withdrawals from compound v2", async () => {});

  //
  // it("should handle borrows from compound v2", async () => {});

  // eg 0xdee8b8c866b692e4c196454630b06eee59f86250afa3419b2d5e8a07971946ae
  // it("should handle repayments to compound v2", async () => {});

});

