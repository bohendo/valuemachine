import {
  TransferCategories,
} from "@valuemachine/types";

import {
  parseEthTx,
  expect,
  testLogger,
} from "../testUtils";

import { apps } from "./enums";

const appName = apps.UniswapV3;
const logger = testLogger.child({ module: `Test${appName}` }, { level: "warn" });

describe(appName, () => {

  it("should handle swaps", async () => {
    const tx = await parseEthTx({
      selfAddress: "0x8266C20Cb25A5E1425cb126D78799B2A138B6c46",
      hash: "0x7f9a66b6e82dfc72d107d43a1a3170464cdad7ad90574ac0e390022ca9add50a",
      logger,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.match(/swap/i);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

});
