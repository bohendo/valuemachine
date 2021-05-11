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

  it("should parse a SAI borrow", async () => {
    addressBook.newAddress(
      "0x213fe7e177160991829a4d0a598a848d2448f384",
      AddressCategories.Self,
      "test-self",
    );
    const chainData = await getRealChainData(
      "0x39ac4111ceaac95a9eee278b05ca38db3142a188bb33d5aa1c646546fc8d31c6"
    );
    log.info(chainData);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    expect(txns.json[0].transfers.length).to.equal(2);
    expect(txns.json[0].transfers[0].category).to.equal(TransferCategories.Expense);
    expect(txns.json[0].transfers[0].to).to.equal(tubAddress);
  });

});
