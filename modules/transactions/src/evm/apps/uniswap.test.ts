import {
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";

import {
  expect,
  parseEthTx,
  testLogger,
} from "../testUtils";

const source = TransactionSources.Uniswap;
const { Expense, SwapIn, SwapOut } = TransferCategories;
const logger = testLogger.child({ module: `Test${source}`,
  // level: "debug",
});

describe(source, () => {
  it("should handle a v1 swap", async () => {
    const tx = await parseEthTx({
      hash: "0x25e3f8798ff7f1e85f1ee5479d8e74c861ca97963a8356c9c6b7a6505b007423",
      selfAddress: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      logger,
      calls: [{
        from: "0x09cabec1ead1c0ba254b09efb3ee13841712be14",
        to: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
        value: "7.139681444502334347"
      }]
    });
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(3);
    const fee = tx.transfers[0];
    expect(fee.category).to.equal(Expense);
    const swapIn = tx.transfers[1];
    expect(swapIn.category).to.equal(SwapIn);
    const swapOut = tx.transfers[2];
    expect(swapOut.category).to.equal(SwapOut);
  });

  it("should handle a v2 swap", async () => {
    const tx = await parseEthTx({
      hash: "0x6b4bd1513d3afe1e48c0ab10bbb14f2af5f2b6ca9b27d59f8a69612c3f0815bd",
      selfAddress: "0x56178a0d5f301baf6cf3e1cd53d9863437345bf9",
      logger,
    });
    expect(tx.sources).to.include(source);
    expect(tx.method.toLowerCase()).to.include("trade");
    expect(tx.transfers.length).to.equal(2);
    const swapOut = tx.transfers[0];
    expect(swapOut.category).to.equal(SwapOut);
    const swapIn = tx.transfers[1];
    expect(swapIn.category).to.equal(SwapIn);
  });

  it("should handle liquidity deposit to v2", async () => {
    const tx = await parseEthTx({
      hash: "0x24751ebed5fe45966c73858bcc01eab12d45d2ee6ff956c1c7cb31b8f89d3d15",
      selfAddress: "0xd0353030484a97ae850f7f35f5bc09797de792f2",
      logger,
      calls: [{
        from: "0x09cabec1ead1c0ba254b09efb3ee13841712be14",
        to: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
        value: "7.139681444502334347"
      }]
    });
    expect(tx.method.toLowerCase()).to.include("supply liquidity");
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(SwapOut);
    expect(tx.transfers[1].category).to.equal(SwapOut);
    expect(tx.transfers[2].category).to.equal(SwapIn);
  });

  it("should handle liquidity withdrawal from v2", async () => {
    const tx = await parseEthTx({
      hash: "0x3377b07094bcf5f911ceeaf284bb2d4a2a56f8a316923890e47c07f71f111825",
      selfAddress: "0xfbb1068305c8ddd36f85d84880b2903d4b45e876",
      logger,
      calls: [{
        from: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
        to: "0xfbb1068305c8ddd36f85d84880b2903d4b45e876",
        value: "5.834880677808569597"
      }]
    });
    expect(tx.method.toLowerCase()).to.include("remove liquidity");
    expect(tx.transfers.length).to.equal(4);
    expect(tx.transfers[0].category).to.equal(Expense);
    expect(tx.transfers[1].category).to.equal(SwapIn);
    expect(tx.transfers[2].category).to.equal(SwapOut);
    expect(tx.transfers[3].category).to.equal(SwapIn);
  });

});
