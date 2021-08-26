import {
  TransferCategories,
} from "@valuemachine/types";

import { EvmAssets } from "../../enums";
import {
  parseEthTx,
  expect,
  testLogger,
} from "../testUtils";

import { names } from "./enums";

const appName = names.Weth;
const { SwapIn, SwapOut } = TransferCategories;
const logger = testLogger.child({ module: `Test${appName}` }, {
  // level: "debug",
});

describe(appName, () => {
  it("should parse a weth deposit", async () => {
    const tx = await parseEthTx({
      hash: "0xbbbd2b0c777b8f7ce7b3d16ba42452c6b50e6145a22b769ae61620d7ed549db4",
      selfAddress: "0xd8011dd927e9751a6dd3414b75933ca7c2f07b96",
      logger,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    const swapOut = tx.transfers[1];
    expect(swapOut.asset).to.equal(EvmAssets.ETH);
    expect(swapOut.category).to.equal(SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.asset).to.equal(EvmAssets.WETH);
    expect(swapIn.category).to.equal(SwapIn);
    expect(swapIn.quantity).to.equal(swapOut.quantity);
  });

  it("should parse a weth withdrawal", async () => {
    const tx = await parseEthTx({
      hash: "0xe02431babbcfc97367fd652176bd3af33c3626a9c40427f80ea31025bef43d36",
      selfAddress: "0x2b6dfd49bf64eef655026f1ab66b77156d0328bf",
      logger,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    const swapOut = tx.transfers[1];
    expect(swapOut.asset).to.equal(EvmAssets.WETH);
    expect(swapOut.category).to.equal(SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.asset).to.equal(EvmAssets.ETH);
    expect(swapIn.category).to.equal(SwapIn);
    expect(swapIn.quantity).to.equal(swapOut.quantity);
  });
});
