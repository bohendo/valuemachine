import { expect } from "chai";

import { TransferCategories } from "../../../enums";
import { Apps, Methods } from "../../enums";
import { getParseTx, testLogger } from "../../testUtils";

const appName = Apps.ETH2;
const log = testLogger.child({ name: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger: log });

describe(appName, () => {

  it("should parse a deposit", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x389efa110449ab51891e9cbe06ab3939ca2fdc9bbff813242ef540bfc090e364",
      selfAddress: "Ethereum/0xa2abe03f3a906dc11e05e90489946e5844374708",
    });
    expect(tx).to.be.ok;
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Deposit);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[1].to).to.include(appName);
  });

});
