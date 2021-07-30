import {
  Assets,
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";

import {
  parseEthTx,
  expect,
  testLogger,
} from "../testUtils";

const source = TransactionSources.Weth;
const { SwapIn, SwapOut } = TransferCategories;
const logger = testLogger.child({ module: `Test${source}`,
  // level: "debug",
});

describe(source, () => {
  it("should parse a weth deposit", async () => {
    const tx = await parseEthTx({
      hash: "0xbbbd2b0c777b8f7ce7b3d16ba42452c6b50e6145a22b769ae61620d7ed549db4",
      selfAddress: "0xd8011dd927e9751a6dd3414b75933ca7c2f07b96",
      logger,
    });
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(3);
    const swapOut = tx.transfers[1];
    expect(swapOut.asset).to.equal(Assets.ETH);
    expect(swapOut.category).to.equal(SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.asset).to.equal(Assets.WETH);
    expect(swapIn.category).to.equal(SwapIn);
    expect(swapIn.quantity).to.equal(swapOut.quantity);
  });

  // eg 0x6bd79c3ef5947fe0e5f89f4060eca295277b949dcbd849f69533ffd757ac1bcd
  it("should parse a weth withdrawal", async () => {
    const tx = await parseEthTx({
      hash: "0xe02431babbcfc97367fd652176bd3af33c3626a9c40427f80ea31025bef43d36",
      selfAddress: "0x2b6dfd49bf64eef655026f1ab66b77156d0328bf",
      calls: [{
        from: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        to: "0x2b6dfd49bf64eef655026f1ab66b77156d0328bf",
        value: "17.528858650249368919"
      }],
      logger,
    });
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(3);
    const swapOut = tx.transfers[1];
    expect(swapOut.asset).to.equal(Assets.WETH);
    expect(swapOut.category).to.equal(SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.asset).to.equal(Assets.ETH);
    expect(swapIn.category).to.equal(SwapIn);
    expect(swapIn.quantity).to.equal(swapOut.quantity);
  });
});
