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
      hash: "0x5d43e5c81730b55e4bb506768e79593099502ad7e2e9ef0a43da2d88ba4e937a",
      selfAddress: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      logger,
      calls: [{
        from: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
        to: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
        value: "0.705704103459495063"
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
});
