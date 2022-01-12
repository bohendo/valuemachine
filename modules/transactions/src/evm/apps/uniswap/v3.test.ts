import { expect } from "chai";

import { TransferCategories } from "../../../enums";
import { Apps } from "../../enums";
import { getParseTx, testLogger } from "../../testUtils";

const appName = Apps.UniswapV3;
const logger = testLogger.child({ name: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger });

describe(appName, () => {

  it("should handle swaps", async () => {
    const tx = await parseTx({
      selfAddress: "Ethereum/0x8266C20Cb25A5E1425cb126D78799B2A138B6c46",
      txid: "Ethereum/0x7f9a66b6e82dfc72d107d43a1a3170464cdad7ad90574ac0e390022ca9add50a",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.match(/trade/i);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle swaps w refunds", async () => {
    const tx = await parseTx({
      selfAddress: "Ethereum/0x14b889b25e70f60d8dc0aa5f10c83680add61351",
      txid: "Ethereum/0x5c6b0cb298522659a3062fdf123b79248c4134006160e8d448e6dc22b9500188",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.match(/trade/i);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Refund);
    expect(tx.transfers[3].category).to.equal(TransferCategories.SwapIn);
  });

});
