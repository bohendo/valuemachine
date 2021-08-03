import {
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";

import {
  expect,
  parseEthTx,
  testLogger,
} from "../testUtils";

const source = TransactionSources.Maker;
const { Expense, Deposit, Withdraw, SwapIn, SwapOut, Borrow, Repay } = TransferCategories;
const logger = testLogger.child({ module: `Test${source}`,
  // level: "debug",
});

describe(source, () => {
  it("should handle a WETH to PETH swap", async () => {
    const tx = await parseEthTx({
      hash: "0x25441cec88c76e0f3a00b9ecbcc803f8cd8aff9de358e39c6b3f44dfdafd2aed",
      selfAddress: "0x213fe7e177160991829a4d0a598a848d2448f384",
      logger,
    });
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(3);
    const swapOut = tx.transfers[1];
    expect(swapOut.category).to.equal(SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.category).to.equal(SwapIn);
  });

  it("should handle a PETH withdrawal with duplicate events", async () => {
    const tx = await parseEthTx({
      hash: "0x7c17ce64eb97ebb2e0322595a30fc50b296f9cec391c276410bf2d1a459ff9cf",
      selfAddress: "0x213fe7e177160991829a4d0a598a848d2448f384",
      logger,
    });
    expect(tx.transfers.length).to.equal(2);
    const withdraw = tx.transfers[1];
    expect(withdraw.category).to.equal(Withdraw);
  });

  it("should handle a SAI borrow", async () => {
    const tx = await parseEthTx({
      hash: "0x39ac4111ceaac95a9eee278b05ca38db3142a188bb33d5aa1c646546fc8d31c6",
      selfAddress: "0x213fe7e177160991829a4d0a598a848d2448f384",
      logger,
    });
    expect(tx.transfers.length).to.equal(2);
    const borrow = tx.transfers[1];
    expect(borrow.category).to.equal(Borrow);
  });

  it("should handle a SAI repayment", async () => {
    const tx = await parseEthTx({
      hash: "0xce0ac042673100eb6ad329a5996aa52c43d1f882a0d93bb5607c5a6d27b1014a",
      selfAddress: "0x213fe7e177160991829a4d0a598a848d2448f384",
      logger,
    });
    expect(tx.transfers.length).to.equal(3);
    const repay = tx.transfers[1];
    expect(repay.category).to.equal(Repay);
    const fee = tx.transfers[2];
    expect(fee.category).to.equal(Expense);
  });

  it("should handle a SAI cage cashout", async () => {
    const tx = await parseEthTx({
      hash: "0xa2920b7319c62fa7d2bf5072a292972fe74af5f452d905495da1fb0d28bba86b",
      selfAddress: "0x50509324beedeaf5ae19186a6cc2c30631a98d97",
      logger,
    });
    expect(tx.transfers.length).to.equal(3);
    const swapOut = tx.transfers[1];
    expect(swapOut.category).to.equal(SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.category).to.equal(SwapIn);
  });

  it("should handle a SAI to DAI migration", async () => {
    const tx = await parseEthTx({
      hash: "0x20de49f7742cd25eaa75b4d09158f45b72ff7d847a250b4b60c9f33ac00bd759",
      selfAddress: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      logger,
    });
    expect(tx.transfers.length).to.equal(3);
    const swapOut = tx.transfers[1];
    expect(swapOut.category).to.equal(SwapOut);
    const swapIn = tx.transfers[2];
    expect(swapIn.category).to.equal(SwapIn);
  });

  it("should handle a DAI deposit to DSR", async () => {
    const tx = await parseEthTx({
      hash: "0x622431660cb6ee607e12ad077c8bf9f83f5f8cf495dbc919d55e9edcaebe22e0",
      selfAddress: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      logger,
    });
    expect(tx.transfers.length).to.equal(2);
    const deposit = tx.transfers[1];
    expect(deposit.category).to.equal(Deposit);
  });
});
