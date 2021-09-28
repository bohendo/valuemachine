import {
  TransferCategories,
} from "@valuemachine/types";

import {
  expect,
  parseEthTx,
  testLogger,
} from "../testUtils";

import { apps } from "./enums";

const appName = apps.Dai;
const logger = testLogger.child({ module: `Test${appName}` }, { level: "warn" });

describe(appName, () => {

  it("should handle a SAI to DAI migration", async () => {
    const tx = await parseEthTx({
      hash: "0x20de49f7742cd25eaa75b4d09158f45b72ff7d847a250b4b60c9f33ac00bd759",
      selfAddress: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      logger,
    });
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle a DAI deposit to DSR", async () => {
    const tx = await parseEthTx({
      hash: "0x622431660cb6ee607e12ad077c8bf9f83f5f8cf495dbc919d55e9edcaebe22e0",
      selfAddress: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      logger,
    });
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
  });

});
