import { TransferCategories } from "@valuemachine/types";

import { Apps, Methods } from "../../enums";
import {
  getParseTx,
  expect,
  testLogger,
} from "../../testUtils";

const appName = Apps.Idex;
const log = testLogger.child({ module: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger: log });

describe(appName, () => {

  it("should handle deposits to Idex", async () => {
    const tx = await parseTx({
      selfAddress: "Ethereum/0x1057bea69c9add11c6e3de296866aff98366cfe3",
      txid: "Ethereum/0x413f01061c0f07b3cfcc16a02f404108c67500252bdf073c2e3613a37abf7ac6",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Deposit);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
  });

  // NOTE: this test must come after the deposit test
  // bc there is a persistent state variable that needs to be updated :(
  it("should insert a trade while withdrawing from Idex", async () => {
    const tx = await parseTx({
      selfAddress: "Ethereum/0x1057bea69c9add11c6e3de296866aff98366cfe3",
      txid: "Ethereum/0xa436cc38b48de1267b6d1dcdb086efa65249e363a2d95f6af11ae6eb0a527555",
    });
    log.info(tx);
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Trade);
    expect(tx.transfers[0].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[0].from).to.include(appName);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[1].to).to.include(appName);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[2].from).to.include(appName);
  });

});
