import { CsvSources, Transactions } from "@valuemachine/types";
import { getTransactionsError } from "@valuemachine/utils";

import { getAddressBook, getTransactions } from "../index";
import {
  expect,
  testLogger,
} from "../testUtils";

const log = testLogger.child({
  // level: "debug",
  module: "TestTransactions",
});

const timestamp = "2018-01-02T01:00:00Z";
const value = "1.3141592653589793";

const exampleCoinbaseCsv =
`Timestamp,           Transaction Type,Asset,Quantity Transacted,      USD Spot Price at Transaction,USD Subtotal,USD Total (inclusive of fees),USD Fees,Notes
2018-01-01T01:00:00Z, Buy,             BTC,  0.1,                      1500.00,                      150.00,      165.00,                       15.00,   Bought 0.0300 BTC for $165.00 USD
${timestamp.replace("00Z", "30Z")}, Receive, ETH, ${value.substring(0, 10)},650.00,                  "",          "",                           "",      Received 1.0000 ETH from an external account
2018-01-03T01:00:00Z, Sell,            ETH,  1.0,                      600.00,                       600.00,      590.00,                       10.00,   Sold 1.0000 ETH for $590.00 USD
`.replace(/, +/g, ",");

describe("Coinbase", () => {
  let addressBook;
  let txns: Transactions;

  beforeEach(() => {
    addressBook = getAddressBook();
    txns = getTransactions({ addressBook, logger: log });
    expect(txns.json.length).to.equal(0);
  });

  it("should generate valid transactions", async () => {
    txns.mergeCsv(exampleCoinbaseCsv, CsvSources.Coinbase);
    const txError = getTransactionsError(txns.json);
    expect(txError).to.be.null;
  });

  it("should merge coinbase data multiple times without creaing duplicates", async () => {
    txns.mergeCsv(exampleCoinbaseCsv, CsvSources.Coinbase);
    expect(txns.json.length).to.equal(3);
    txns.mergeCsv(exampleCoinbaseCsv, CsvSources.Coinbase);
    expect(txns.json.length).to.equal(3);
  });

});
