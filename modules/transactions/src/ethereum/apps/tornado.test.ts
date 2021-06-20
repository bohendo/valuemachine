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

const source = TransactionSources.Tornado;
const { Expense, Deposit, Withdraw } = TransferCategories;
const log = testLogger.child({
  // level: "debug",
  module: `Test${source}`,
});

describe(source, () => {
  let addressBook;

  beforeEach(() => {
    addressBook = getTestAddressBook();
  });

  it("should handle deposits to tornado", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0x5e70e647a5dee8cc7eaddc302f2a7501e29ed00d325eaec85a3bde5c02abf1ec";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const tx = parseEthTx(await getEthTx(txHash), [], addressBook, log);
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(2);
    const deposit = tx.transfers[1];
    expect(deposit.category).to.equal(Deposit);
  });

  it("should handle withdraws from tornado", async () => {
    const selfAddress = "0x1057bea69c9add11c6e3de296866aff98366cfe3";
    const txHash = "0xdd6beaa1dfed839747217c721696d81984e2507ef973cd3efb9e0cfe486a0b80";
    addressBook.newAddress(selfAddress, AddressCategories.Self, "test-self");
    const tx = parseEthTx(await getEthTx(txHash), [getTestEthCall({
      from: "0xb541fc07bc7619fd4062a54d96268525cbc6ffef",
      hash: txHash,
      to: selfAddress,
      value: "0.079"
    })], addressBook, log);
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(2);
    const fee = tx.transfers[0];
    expect(fee.category).to.equal(Expense);
    const deposit = tx.transfers[1];
    expect(deposit.category).to.equal(Withdraw);
  });

});


