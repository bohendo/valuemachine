import {
  TransferCategories,
} from "@valuemachine/types";

import { Apps } from "../../enums";
import {
  getParseTx,
  expect,
  testLogger,
} from "../../testUtils";

const appName = Apps.Compound;
const logger = testLogger.child({ module: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger });

describe(appName, () => {
  it("should handle deposits to compound v1", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x4bd1cb92d370a3b69b697e606e905d76a003b28c1605d2e46c9a887202b72ae0",
      selfAddress: "Ethereum/0x1057bea69c9add11c6e3de296866aff98366cfe3",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
  });

  it("should handle withdrawals from compound v1", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x1ebdcb2989fe980c40bbce3e68a9d74832ab67a4a0ded2be503ec61335e4bad6",
      selfAddress: "Ethereum/0x1057bea69c9add11c6e3de296866aff98366cfe3",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Income);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Internal);
  });

  it("should handle deposits to compound v2", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x1e17fdbe0dece46ad08ba84fd624072659684b354642d37b05b457108cea6f63",
      selfAddress: "Ethereum/0x1057bea69c9add11c6e3de296866aff98366cfe3",
    });
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle withdrawals from compound v2", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x9105678815630bf456b4af5e13de9e5e970e25bb3a8849a74953d833d2a9e499",
      selfAddress: "Ethereum/0x1057bea69c9add11c6e3de296866aff98366cfe3",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapOut);
  });

  it("should handle compound v2 market entries", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x998aedf25aeb6657ffd1d16dbff963a41a20ea42fd6740264b9f492fe0623eea",
      selfAddress: "Ethereum/0x1057bea69c9add11c6e3de296866aff98366cfe3",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(1);
  });

  it("should handle borrows from compound v2", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x032e9d84b07fdd3e546b44b4fa034d1b470e927188df9594af7e5d656588aad0",
      selfAddress: "Ethereum/0x1057bea69c9add11c6e3de296866aff98366cfe3",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Borrow);
  });

  it("should handle repayments to compound v2", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xdee8b8c866b692e4c196454630b06eee59f86250afa3419b2d5e8a07971946ae",
      selfAddress: "Ethereum/0x1057bea69c9add11c6e3de296866aff98366cfe3",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Repay);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Refund);
  });

});

