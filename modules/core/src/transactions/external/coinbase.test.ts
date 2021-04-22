import { Transactions } from "@finances/types";
import { expect, getLogger } from "@finances/utils";
import { AddressZero } from "@ethersproject/constants";

import { getAddressBook } from "../../addressBook";
import { exampleCoinbaseCsv } from "../testing";
import { getTransactions } from "../index";

const log = getLogger("debug").child({ module: "TestTransactions" });

describe.only("mergeCoinbase", () => {
  const addressBook = getAddressBook(
    [{ name: "test", category: "self", address: AddressZero }],
    log
  );
  let txns: Transactions;

  beforeEach(() => {
    txns = getTransactions({ addressBook, logger: log });
  });

  it("should merge coinbase data multiple times without creaing duplicates", async () => {
    expect(txns.getAll().length).to.equal(0);
    txns.mergeCoinbase(exampleCoinbaseCsv);
    expect(txns.getAll().length).to.equal(3);
    txns.mergeCoinbase(exampleCoinbaseCsv);
    expect(txns.getAll().length).to.equal(3);
  });

});

