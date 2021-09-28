import { TransferCategories } from "@valuemachine/types";

import {
  getParseTx,
  expect,
  testLogger,
} from "../../testUtils";

import { apps } from "./enums";

const appName = apps.Idle;
const logger = testLogger.child({ module: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger });

describe(appName, () => {
  it("should handle deposits to idle DAI", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xbf0ddcf082109eb0431e2d244c7d27eb1b3ae653411ba35f4288979e63a8dfb0",
      selfAddress: "Ethereum/0x2b4d4a660cddae942c26821a5512c32023719476",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.match(/deposit/i);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle withdrawals from idle DAI", async () => {
    const tx = await parseTx({
      selfAddress: "Ethereum/0xbe8fe12b9eb1ca2a593e6c070c71c294b6fe9f00",
      txid: "Ethereum/0x240991b841d2378c588d3bced7d477ac0405d1ba7cafac2e10f5a9451334cdd6",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.match(/withdrawal/i);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Income);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Income);
    expect(tx.transfers[3].category).to.equal(TransferCategories.Income);
    expect(tx.transfers[4].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[5].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle staking IDLE", async () => {
    const tx = await parseTx({
      selfAddress: "Ethereum/0xabca81eef45234f11cb9b9f6f3626b24bb8ace3e",
      txid: "Ethereum/0x5ac6f4515725f036121fa897d370f782bee17806db305559e681044871e560b0",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.match(/stake/i);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
  });
});
