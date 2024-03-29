import { expect } from "chai";

import { TransferCategories } from "../../../enums";
import { Apps } from "../../enums";
import { getParseTx, testLogger } from "../../testUtils";

const appName = Apps.Token;
const logger = testLogger.child({ name: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger });

describe(appName, () => {
  it("should parse token transfers", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x4363e7c277c015f9fbf59d2bcf02822e430909faff70f6c8ddd686e3b644535a",
      selfAddress: "Ethereum/0x0f66cfe7e71ec4c700076eae12981fdd225b7274",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.method.toLowerCase()).to.include("transfer");
    expect(tx.transfers[1].category).to.equal(TransferCategories.Expense);
  });

  it("should parse token approvals", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x3438abaf9afad83060ad06f8095401128c52406995fb14a6d5d46457d24d1f9a",
      selfAddress: "Ethereum/0x99c35a4ccd7642c3d7675b06a7721321a68d7874",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(1);
    expect(tx.method.toLowerCase()).to.include("approval");
  });
});
