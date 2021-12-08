import { TransferCategories } from "../../../enums";
import { Apps, Methods } from "../../enums";
import {
  getParseTx,
  expect,
  testLogger,
} from "../../testUtils";

const appName = Apps.Quickswap;
const logger = testLogger.child({ module: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger });

describe(appName, () => {
  it("should handle a swap", async () => {
    const tx = await parseTx({
      selfAddress: "Polygon/0x8266c20cb25a5e1425cb126d78799b2a138b6c46",
      txid: "Polygon/0xfbf4af6a377016d3b2ce8cd413f83487954723dafd9b7ad70079b0276209958a",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.equal(Methods.Trade);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });
});

