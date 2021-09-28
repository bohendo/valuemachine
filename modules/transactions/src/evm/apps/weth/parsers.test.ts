import {
  TransferCategories,
} from "@valuemachine/types";

import {
  getParseTx,
  expect,
  testLogger,
} from "../../testUtils";

import { apps } from "./enums";

const logger = testLogger.child({ module: `Test${apps.Weth}` }, { level: "warn" });
const parseTx = getParseTx({ logger });

describe(apps.Weth, () => {

  it("should parse a WETH deposit", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xbbbd2b0c777b8f7ce7b3d16ba42452c6b50e6145a22b769ae61620d7ed549db4",
      selfAddress: "Ethereum/0xd8011dd927e9751a6dd3414b75933ca7c2f07b96",
    });
    expect(tx.apps).to.include(apps.Weth);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[1].amount).to.equal(tx.transfers[2].amount);
  });

  it("should parse a WETH withdrawal", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xe02431babbcfc97367fd652176bd3af33c3626a9c40427f80ea31025bef43d36",
      selfAddress: "Ethereum/0x2b6dfd49bf64eef655026f1ab66b77156d0328bf",
    });
    expect(tx.apps).to.include(apps.Weth);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[1].amount).to.equal(tx.transfers[2].amount);
  });

  it("should parse a WMATIC deposit", async () => {
    const tx = await parseTx({
      txid: "Polygon/0xfb8caa99670d02c84ea9cac92d524fb65b1ba8e90c80d9ee59eb83a7d4daee4f",
      selfAddress: "Polygon/0x4a9c1626d288de0c2c47b8bb53b080029f520997",
    });
    expect(tx.apps).to.include(apps.WMatic);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[1].amount).to.equal(tx.transfers[2].amount);
  });

  it("should parse a WMATIC withdrawal", async () => {
    const tx = await parseTx({
      txid: "Polygon/0xa088ef4ec3ad6f48eb203f5898c00015823989a28ecce30f884dc454f78e38cd",
      selfAddress: "Polygon/0xf0d59c42f4d1ad9da19d494388625c3ef547434c",
    });
    expect(tx.apps).to.include(apps.WMatic);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[1].amount).to.equal(tx.transfers[2].amount);
  });

});
