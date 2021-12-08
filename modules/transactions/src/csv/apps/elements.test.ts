import { expect } from "chai";

import { getTransactionsError } from "../../utils";
import { parseCsv } from "../parser";

const exampleElementsCsv =
`Account Number,Post Date,Check,Description,Debit,Credit,Status,Balance,Classification
"123456789100",1/2/2021,,"Shmekl Purchase",1260.00,,Posted,11084.69,""
"123456789100",1/1/2021,,"Interest Income",,.12,Posted,12345.68,"Interest Income"
"123456789100",1/2/2021,,"Foobar Purchase",0.99,,Posted,11085.68,""`;

describe("Elements", () => {
  it("should generate valid transactions", async () => {
    const txns = parseCsv(exampleElementsCsv);
    const txError = getTransactionsError(txns);
    expect(txError).to.equal("");
  });

});
