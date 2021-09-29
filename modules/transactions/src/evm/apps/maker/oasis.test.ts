import {
  TransferCategories,
} from "@valuemachine/types";

import { Apps } from "../../enums";
import {
  getParseTx,
  expect,
  testLogger,
} from "../../testUtils";

const appName = Apps.Oasis;
const logger = testLogger.child({ module: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger });

describe(appName, () => {
  it("should handle a v1 buy", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x5e15f70d656308e72be1d0772dae4c275e7efdff2ab778f7ae4eaefede616e38",
      selfAddress: "Ethereum/0x213fe7e177160991829a4d0a598a848d2448f384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle a swap via proxy", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x7c1a36431b0fd001f20277850f16226a44ce1b83db89d0572a7e9289cbcc7c3b",
      selfAddress: "Ethereum/0xada083a3c06ee526f827b43695f2dcff5c8c892b",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(11);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[3].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[4].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[5].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[6].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[7].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[8].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[9].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[10].category).to.equal(TransferCategories.SwapIn);
  });

});

