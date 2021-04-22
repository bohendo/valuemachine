import { Transactions } from "@finances/types";
import { expect } from "@finances/utils";
import { AddressZero } from "@ethersproject/constants";

import { getAddressBook } from "../../addressBook";
import { getFakeChainData, testLogger } from "../testing";
import { getTransactions } from "../index";

const log = testLogger.child({ level: "debug", module: "TestTransactions" });

const exampleCoinbaseCsv =
`Timestamp,           Transaction Type,Asset,Quantity Transacted,USD Spot Price at Transaction,USD Subtotal,USD Total (inclusive of fees),USD Fees,Notes
2018-01-01T01:00:00Z, Buy,             BTC,  0.1,                1500.00,                      150.00,      165.00,                       15.00,   Bought 0.0300 BTC for $165.00 USD
2018-01-02T01:00:00Z, Receive,         ETH,  1.0,                650.00,                       "",          "",                           "",      Received 1.0000 ETH from an external account
2018-01-03T01:00:00Z, Sell,            ETH,  1.0,                600.00,                       600.00,      590.00,                       10.00,   Sold 1.0000 ETH for $590.00 USD
`.replace(/, +/g, ",");

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

  it("should merge coinbase receive/sends into a matching eth txn", async () => {
    expect(txns.getAll().length).to.equal(0);
    txns.mergeChainData(getFakeChainData({
      value: "1",
      timestamp: "2018-01-02T01:00:00Z",
    }));
    expect(txns.getAll().length).to.equal(1);
    txns.mergeCoinbase(exampleCoinbaseCsv);
    expect(txns.getAll().length).to.equal(3);
    // Re-merging shouldn't insert any duplicates
    txns.mergeCoinbase(exampleCoinbaseCsv);
    expect(txns.getAll().length).to.equal(3);
  });

  it("should merge an eth txn into a matching coinbase receive/send", async () => {
    expect(txns.getAll().length).to.equal(0);
    txns.mergeCoinbase(exampleCoinbaseCsv);
    expect(txns.getAll().length).to.equal(3);
    txns.mergeChainData(getFakeChainData({
      value: "1",
      timestamp: "2018-01-02T01:00:00Z",
    }));
    expect(txns.getAll().length).to.equal(3);
    // Re-merging shouldn't insert any duplicates
    txns.mergeChainData(getFakeChainData({
      value: "1",
      timestamp: "2018-01-02T01:00:00Z",
    }));
    expect(txns.getAll().length).to.equal(3);

  });

});

