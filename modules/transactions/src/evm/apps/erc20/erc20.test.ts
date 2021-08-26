import {
  parseEthTx,
  expect,
  testLogger,
} from "../testUtils";

import { apps } from "./enums";

const appName = apps.ERC20;
const logger = testLogger.child({ module: `Test${appName}` }, {
  // level: "debug",
});

describe(appName, () => {
  it("should parse erc20 transfers", async () => {
    const tx = await parseEthTx({
      hash: "0x4363e7c277c015f9fbf59d2bcf02822e430909faff70f6c8ddd686e3b644535a",
      selfAddress: "0x0f66cfe7e71ec4c700076eae12981fdd225b7274",
      logger,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.method.toLowerCase()).to.include("transfer");
  });

  it("should parse erc20 approvals", async () => {
    const tx = await parseEthTx({
      hash: "0x3438abaf9afad83060ad06f8095401128c52406995fb14a6d5d46457d24d1f9a",
      selfAddress: "0x99c35a4ccd7642c3d7675b06a7721321a68d7874",
      logger,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(1);
    expect(tx.method.toLowerCase()).to.include("approval");
  });
});
