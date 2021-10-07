import { Transactions } from "@valuemachine/types";
import { getTransactionsError } from "@valuemachine/utils";

import { getAddressBook, getTransactions } from "../index";
import {
  expect,
  testLogger,
} from "../testUtils";

import { CsvSources } from "./enums";

const source = CsvSources.Elements;
const log = testLogger.child({ module: "TestTransactions" }, { level: "warn" });

const exampleElementsCsv =
`Account Number,Post Date,Check,Description,Debit,Credit,Status,Balance,Classification
"123456789100",1/2/2021,,"Shmekl Purchase",1260.00,,Posted,11084.69,""
"123456789100",1/1/2021,,"Interest Income",,.12,Posted,12345.68,"Interest Income"
"123456789100",1/2/2021,,"Foobar Purchase",0.99,,Posted,11085.68,""`;

describe(source, () => {
  let addressBook;
  let txns: Transactions;

  beforeEach(() => {
    addressBook = getAddressBook();
    txns = getTransactions({ addressBook, logger: log });
    expect(txns.json.length).to.equal(0);
  });

  it("should generate valid transactions", async () => {
    txns.mergeCsv(exampleElementsCsv, source);
    const txError = getTransactionsError(txns.json);
    expect(txError).to.equal("");
  });

  it("should merge csv data multiple times without creaing duplicates", async () => {
    txns.mergeCsv(exampleElementsCsv, source);
    expect(txns.json.length).to.equal(3);
    txns.mergeCsv(exampleElementsCsv, source);
    expect(txns.json.length).to.equal(3);
  });

});
