import { Transactions, TransactionSources, TransferCategories } from "@finances/types";
import { expect } from "@finances/utils";

import {
  getRealChainData,
  testAddressBook,
  testLogger,
} from "../testing";
import { getTransactions } from "../index";

import { makerAddresses } from "./maker";

const log = testLogger.child({ module: "TestTransactions" });

describe(TransactionSources.Maker, () => {
  let txns: Transactions;
  const tubAddress = makerAddresses.find(e => e.name === "scd-tub").address;

  beforeEach(() => {
    txns = getTransactions({ addressBook: testAddressBook, logger: log });
    expect(txns.json.length).to.equal(0);
  });

  it("should parse a SAI borrow", async () => {
    const chainData = await getRealChainData(
      "0x39ac4111ceaac95a9eee278b05ca38db3142a188bb33d5aa1c646546fc8d31c6"
    );
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    expect(txns.json[0].transfers.length).to.equal(2);
    expect(txns.json[0].transfers[0].category).to.equal(TransferCategories.Expense);
    expect(txns.json[0].transfers[0].to).to.equal(tubAddress);
  });

  /*
  it("should handle repaying SAI and withdrawing ETH", async () => {});
  it("should handle migration of SAI to DAI", async () => {});
  it("should handle depositng ETH and borrowing DAI", async () => {});
  it("should handle repaying DAI and withdrawing ETH", async () => {});
  it("should handle deposits into Dai Savings Rate", async () => {
    // eg 0x622431660cb6ee607e12ad077c8bf9f83f5f8cf495dbc919d55e9edcaebe22e0
  });
  it("should handle withdrawals from Dai Savings Rate", async () => {
    // eg withdrawal: 0xa4b3389bd29cc186451a6c79ea5d9b9422e4fcca931a5d76ca431041c8744d30
  });
  */

});
