import { getTransactionsError } from "@valuemachine/utils";

import { expect } from "../../testUtils";
import { parseCsv } from "../parser";

import { wyreHeaders } from "./wyre";

const exampleCsv = `${wyreHeaders}
"Jan 2, 2021 1:00:00 PM UTC","Jan 1, 2021 2:00:00 PM UTC","BlahBlah","account:ABC123","paymentmethod:ABC123","DAI","USD","3000.00","3010.00","","OUTGOING","Primary Account","USD Bank account ending in 0000","COMPLETED","","1.00","","","0.00","","","25.00","3500.00","30.00","","","","","","","",""
"Jan 1, 2021 1:00:00 PM UTC","Jan 1, 2021 2:00:00 PM UTC","BlahBlah","ethereum:0xabc","account:ABC123","DAI","DAI","3000.0","3000.0","","INCOMING","0xabc","Primary Account","COMPLETED","","","","","","0x123","","","","","3000.0","","","","","","",""
`;

describe("Wyre", () => {

  it("should generate valid transactions", async () => {
    const txns = parseCsv(exampleCsv);
    const txError = getTransactionsError(txns);
    expect(txError).to.equal("");
  });

});


