import { expect } from "chai";

import { TransferCategories } from "../../../enums";
import { Apps } from "../../enums";
import { getParseTx, testLogger } from "../../testUtils";

const appName = Apps.EtherDelta;
const log = testLogger.child({ name: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger: log });

describe(appName, () => {
  it("should handle a deposit", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x37f4fbcd53d68c3b9297b6d2d5034a5604234310ae443d300fa918af7d7e42f4",
      selfAddress: "Ethereum/0x213fe7e177160991829a4d0a598a848d2448f384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
  });

  it("should handle a trade", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x3f55624c4e0c3bfd8c2f60432776432f12efc31b0258a0a3034502d667368f6b",
      selfAddress: "Ethereum/0x213fe7e177160991829a4d0a598a848d2448f384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle a withdraw", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xec9b74458504b5058290983ef09093c58187bfcf888374187a9469cad793425f",
      selfAddress: "Ethereum/0x213fe7e177160991829a4d0a598a848d2448f384",
    });
    log.info(tx);
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Fee);
  });
});
