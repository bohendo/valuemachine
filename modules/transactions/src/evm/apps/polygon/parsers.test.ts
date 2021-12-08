import { TransferCategories } from "../../../enums";
import { Apps } from "../../enums";
import {
  getParseTx,
  expect,
  testLogger,
} from "../../testUtils";

const appName = Apps.Polygon;
const logger = testLogger.child({ module: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger });

describe("Polygon Bridge", () => {

  it("should handle zap bridge to matic via uniswap & 0x", async () => {
    const tx = await parseTx({
      selfAddress: "Ethereum/0xada083a3c06ee526f827b43695f2dcff5c8c892b",
      txid: "Ethereum/0xafe41962f39cf25034aecd3f3278e8f7ed0b4dc60e612c10c68c8599a29dad45",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(6);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[3].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[4].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[5].category).to.equal(TransferCategories.Internal);
  });

  it("should handle zap bridge to matic via balancer", async () => {
    const tx = await parseTx({
      selfAddress: "Ethereum/0xada083a3c06ee526f827b43695f2dcff5c8c892b",
      txid: "Ethereum/0xbd964c1f0b3725910b76be2a32715131fb6aa692b6f4f3dcf568f35b4b9ca575",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(6);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[3].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[4].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[5].category).to.equal(TransferCategories.Internal);
  });

  it("should handle plasma bridge to matic", async () => {
    const tx = await parseTx({
      selfAddress: "Ethereum/0x8266c20cb25a5e1425cb126d78799b2a138b6c46",
      txid: "Ethereum/0x08d2277c687bbe4e3bd3baf27ef4c7b2a97f2fb282c72f7eff211c5d16f7e02b",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
  });

});
