import { getTransactionsError } from "@valuemachine/utils";

import { expect } from "../../testUtils";
import { parseCsv } from "../parser";

import { coinbaseHeaders } from "./coinbase";

const exampleCoinbaseCsv =
`
extra info, garbage, and other invalid stuff

${coinbaseHeaders}
2018-01-01T01:00:00Z,Buy,BTC,0.1,1500.00,150.00,165.00,15.00,""
2018-01-02T01:00:00Z,Receive,ETH,1.3141592653589793,650.00,"","","",""
2018-01-03T01:00:00Z,Sell,ETH,1.0,600.00,600.00,590.00,10.00,""
`;

describe("Coinbase", () => {
  it("should generate valid transactions", async () => {
    const txns = parseCsv(exampleCoinbaseCsv);
    const txError = getTransactionsError(txns);
    expect(txError).to.equal("");
  });
});
