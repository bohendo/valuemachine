import { getTransactionsError } from "@valuemachine/utils";

import { expect } from "../../testUtils";
import { parseCsv } from "../parser";

import { digitaloceanHeaders } from "./digitalocean";

const exampleDigitalOceanCsv = `${digitaloceanHeaders}
Volumes,,volume-sfo2-01 (sfo2) 100GB,744,2019-01-01 00:00:00 +0000,2019-01-31 23:59:59 +0000,$10.00,
Droplets,,eth (s-4vcpu-8gb),744,2019-01-01 00:00:00 +0000,2019-02-01 00:00:00 +0000,$40.00,
Droplets,,blog (s-1vcpu-2gb),744,2019-01-01 00:00:00 +0000,2019-02-01 00:00:00 +0000,$10.00,
Droplets,,staging (s-2vcpu-4gb),744,2019-01-01 00:00:00 +0000,2019-02-01 00:00:00 +0000,$20.00,
Droplets,,explorer (s-2vcpu-4gb),744,2019-01-01 00:00:00 +0000,2019-02-01 00:00:00 +0000,$20.00,
Droplets,,indra (s-2vcpu-4gb),446,2019-01-13 09:39:51 +0000,2019-02-01 00:00:00 +0000,$13.27,
Droplets,,alchemy (s-2vcpu-4gb),297,2019-01-01 00:00:00 +0000,2019-01-13 09:31:34 +0000,$8.84,
`;

describe("Digital Ocean", () => {
  it("should generate valid transactions", async () => {
    const txns = parseCsv(exampleDigitalOceanCsv);
    const txError = getTransactionsError(txns);
    expect(txError).to.equal("");
  });
});

