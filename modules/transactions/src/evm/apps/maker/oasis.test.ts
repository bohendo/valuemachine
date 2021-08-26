import {
  TransferCategories,
} from "@valuemachine/types";

import {
  expect,
  testLogger,
  parseEthTx,
} from "../testUtils";

import { apps } from "./enums";

const appName = apps.Oasis;
const { Expense, SwapIn, SwapOut } = TransferCategories;
const logger = testLogger.child({ module: `Test${appName}` }, {
  // level: "debug",
});

describe(appName, () => {
  it("should handle a v1 buy", async () => {
    const tx = await parseEthTx({
      hash: "0x5e15f70d656308e72be1d0772dae4c275e7efdff2ab778f7ae4eaefede616e38",
      selfAddress: "0x213fe7e177160991829a4d0a598a848d2448f384",
      logger,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    const base = tx.transfers[0];
    expect(base.category).to.equal(Expense);
    const swapOut = tx.transfers[1];
    expect(swapOut.category).to.equal(SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.category).to.equal(SwapIn);
  });

  it("should handle a v1 sell", async () => {
    const tx = await parseEthTx({
      hash: "0x5e15f70d656308e72be1d0772dae4c275e7efdff2ab778f7ae4eaefede616e38",
      selfAddress: "0x0005abcbb9533cf6f9370505ffef25393e0d2852",
      logger,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(1);
    const swapIn = tx.transfers[0];
    expect(swapIn.category).to.equal(SwapIn);
  });

  it("should handle a swap via proxy", async () => {
    const tx = await parseEthTx({
      hash: "0x7c1a36431b0fd001f20277850f16226a44ce1b83db89d0572a7e9289cbcc7c3b",
      selfAddress: "0xada083a3c06ee526f827b43695f2dcff5c8c892b",
      logger,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    const swapOut = tx.transfers[1];
    expect(swapOut.category).to.equal(SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.category).to.equal(SwapIn);
  });

});

