import {
  TransferCategories,
} from "@valuemachine/types";

import {
  expect,
  parseEthTx,
  testLogger,
} from "../testUtils";

import { apps } from "./enums";

const appName = apps.UniswapV1;
const logger = testLogger.child({ module: `Test${appName}` }, { level: "warn" });

describe(appName, () => {

  it("should handle a v1 swap", async () => {
    const tx = await parseEthTx({
      hash: "0x25e3f8798ff7f1e85f1ee5479d8e74c861ca97963a8356c9c6b7a6505b007423",
      selfAddress: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      logger,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

});
