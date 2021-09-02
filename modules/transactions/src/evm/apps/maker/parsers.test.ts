import {
  TransferCategories,
} from "@valuemachine/types";

import {
  expect,
  parseEthTx,
  testLogger,
} from "../testUtils";

import { apps } from "./enums";

const appName = apps.Maker;
const { Expense, Internal, SwapIn, SwapOut, Borrow, Repay } = TransferCategories;
const logger = testLogger.child({ module: `Test${appName}` }, {
  // level: "debug",
});

describe(appName, () => {
  it("should handle a WETH to PETH swap", async () => {
    const tx = await parseEthTx({
      hash: "0x25441cec88c76e0f3a00b9ecbcc803f8cd8aff9de358e39c6b3f44dfdafd2aed",
      selfAddress: "0x213fe7e177160991829a4d0a598a848d2448f384",
      logger,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(SwapOut);
    expect(tx.transfers[2].category).to.equal(SwapIn);
  });

  it("should handle a PETH withdrawal with duplicate events", async () => {
    const tx = await parseEthTx({
      hash: "0x7c17ce64eb97ebb2e0322595a30fc50b296f9cec391c276410bf2d1a459ff9cf",
      selfAddress: "0x213fe7e177160991829a4d0a598a848d2448f384",
      logger,
    });
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[1].category).to.equal(Internal);
  });

  it("should handle a SAI borrow", async () => {
    const tx = await parseEthTx({
      hash: "0x39ac4111ceaac95a9eee278b05ca38db3142a188bb33d5aa1c646546fc8d31c6",
      selfAddress: "0x213fe7e177160991829a4d0a598a848d2448f384",
      logger,
    });
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[1].category).to.equal(Borrow);
  });

  it("should handle a SAI repayment", async () => {
    const tx = await parseEthTx({
      hash: "0xce0ac042673100eb6ad329a5996aa52c43d1f882a0d93bb5607c5a6d27b1014a",
      selfAddress: "0x213fe7e177160991829a4d0a598a848d2448f384",
      logger,
    });
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(Repay);
    expect(tx.transfers[2].category).to.equal(Expense);
  });

  it("should handle a SAI cage cashout", async () => {
    const tx = await parseEthTx({
      hash: "0xa2920b7319c62fa7d2bf5072a292972fe74af5f452d905495da1fb0d28bba86b",
      selfAddress: "0x50509324beedeaf5ae19186a6cc2c30631a98d97",
      logger,
    });
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(SwapOut);
    expect(tx.transfers[2].category).to.equal(SwapIn);
  });

  it("should handle a SAI to DAI migration", async () => {
    const tx = await parseEthTx({
      hash: "0x20de49f7742cd25eaa75b4d09158f45b72ff7d847a250b4b60c9f33ac00bd759",
      selfAddress: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      logger,
    });
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(SwapOut);
    expect(tx.transfers[2].category).to.equal(SwapIn);
  });

  it("should handle a DAI deposit to DSR", async () => {
    const tx = await parseEthTx({
      hash: "0x622431660cb6ee607e12ad077c8bf9f83f5f8cf495dbc919d55e9edcaebe22e0",
      selfAddress: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      logger,
    });
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[1].category).to.equal(Internal);
  });

  it("should parse a repayment w fee paid in SAI", async () => {
    const tx = await parseEthTx({
      hash: "0x5919e3da5827d30bc63c8b3023ccefa8d7691fe2d442cab1a18c121fc791200a",
      selfAddress: "0xfdbbfb0fe2986672af97eca0e797d76a0bbf35c9",
      logger,
    });
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(Expense);
    expect(tx.transfers[1].category).to.equal(Repay);
    expect(tx.transfers[2].category).to.equal(Expense);
    expect(tx.transfers[2].to).to.include("CDP");
  });

  it("should parse a CDP deposit via proxy", async () => {
    const tx = await parseEthTx({
      hash: "0x26e7fb1c36992b85d764e8b8ffba44356013e2713b421e190277e05a785716d0",
      selfAddress: "0xa1700938bd2943abfb923d67054287d07bd0cd30",
      logger,
    });
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
  });

  it("should parse a CDP withdraw via proxy", async () => {
    const tx = await parseEthTx({
      hash: "0x30e97ec8235ae69d24873e5596fb708d0622ea817a468ab7111f926a6f9c3387",
      selfAddress: "0x452e1928aa6c88e690f26ea08ec119bf816c8568",
      logger,
    });
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Repay);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Internal);
  });

});
