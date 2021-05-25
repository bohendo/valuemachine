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

const log = testLogger.child({
  // level: "debug",
  module: `Test${TransactionSources.Tornado}`,
});

describe(TransactionSources.Tornado, () => {
  let addressBook;
  let txns: Transactions;

  beforeEach(() => {
    addressBook = getTestAddressBook();
    txns = getTransactions({ addressBook, logger: log });
  });

  it("should handle deposits to tornado", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x5e70e647a5dee8cc7eaddc302f2a7501e29ed00d325eaec85a3bde5c02abf1ec";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.sources).to.include(TransactionSources.Tornado);
    expect(tx.transfers.length).to.equal(2);
    const deposit = tx.transfers[1];
    expect(deposit.category).to.equal(TransferCategories.Deposit);
    expect(tx.description).to.include("deposit");
    expect(tx.description).to.include(math.round(deposit.quantity));
    expect(tx.description).to.include(addressBook.getName(selfAddress));
  });

  it("should handle withdraws from tornado", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0xdd6beaa1dfed839747217c721696d81984e2507ef973cd3efb9e0cfe486a0b80";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const chainData = await getRealChainData(txHash);
    chainData.merge({ transactions: [], tokens: {}, addresses: {}, calls: [{
      block: 8857603,
      contractAddress: "0x0000000000000000000000000000000000000000",
      from: "0xb541fc07bc7619fd4062a54d96268525cbc6ffef",
      hash: "0xdd6beaa1dfed839747217c721696d81984e2507ef973cd3efb9e0cfe486a0b80",
      timestamp: "2019-11-02T07:23:13.000Z",
      to: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      value: "0.079"
    }] });
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.sources).to.include(TransactionSources.Tornado);
    expect(tx.transfers.length).to.equal(1);
    const deposit = tx.transfers[0];
    expect(deposit.category).to.equal(TransferCategories.Withdraw);
    expect(tx.description).to.include("withdr");
    expect(tx.description).to.include(math.round(deposit.quantity));
    expect(tx.description).to.include(addressBook.getName(selfAddress));
  });

});


