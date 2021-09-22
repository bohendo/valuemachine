import {
  TransferCategories,
} from "@valuemachine/types";

import {
  expect,
  parseEthTx,
  testLogger,
} from "../testUtils";

import { apps } from "./enums";

const appName = apps.EtherDelta;
const log = testLogger.child({ module: `Test${appName}` }, { level: "warn" });

describe(appName, () => {
  it("should handle a deposit", async () => {
    const tx = await parseEthTx({
      hash: "0x37f4fbcd53d68c3b9297b6d2d5034a5604234310ae443d300fa918af7d7e42f4",
      selfAddress: "0x213fe7e177160991829a4d0a598a848d2448f384",
      logger: log,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
  });

  it("should handle a trade", async () => {
    const tx = await parseEthTx({
      hash: "0x3f55624c4e0c3bfd8c2f60432776432f12efc31b0258a0a3034502d667368f6b",
      selfAddress: "0x213fe7e177160991829a4d0a598a848d2448f384",
      logger: log,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle a withdraw", async () => {
    const tx = await parseEthTx({
      hash: "0xec9b74458504b5058290983ef09093c58187bfcf888374187a9469cad793425f",
      selfAddress: "0x213fe7e177160991829a4d0a598a848d2448f384",
      logger: log,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
  });
});
