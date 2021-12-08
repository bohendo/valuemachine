import { expect } from "chai";

import { getTransactionsError } from "../../utils";
import { parseCsv } from "../parser";

import { wazirxHeaders } from "./wazirx";

const exampleDepositCsv = `${wazirxHeaders[0]}
"2021-01-01 09:00:00",Withdraw,INR,500000
"2021-01-01 08:00:00",Deposit,USDT,5000.0
`;

const exampleTradeCsv = `${wazirxHeaders[1]}
"2021-01-01 07:00:00",ETHINR,90000,0.1,9000,Sell,INR,19.00
"2021-01-01 06:00:00",UNIINR,1200,1.00,1500.0,Sell,INR,3.5
`;

describe("Wazirx", () => {

  it("should generate valid deposit transactions", async () => {
    const txns = parseCsv(exampleDepositCsv);
    const txError = getTransactionsError(txns);
    expect(txError).to.equal("");
  });

  it("should generate valid trade transactions", async () => {
    const txns = parseCsv(exampleTradeCsv);
    const txError = getTransactionsError(txns);
    expect(txError).to.equal("");
  });

});

