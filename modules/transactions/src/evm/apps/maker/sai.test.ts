import {
  TransferCategories,
} from "@valuemachine/types";

import {
  getParseTx,
  expect,
  testLogger,
} from "../../testUtils";

import { apps } from "./enums";

const appName = apps.Sai;
const logger = testLogger.child({ module: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger });

describe(appName, () => {
  it("should handle a WETH to PETH swap", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x25441cec88c76e0f3a00b9ecbcc803f8cd8aff9de358e39c6b3f44dfdafd2aed",
      selfAddress: "Ethereum/0x213fe7e177160991829a4d0a598a848d2448f384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle a PETH withdrawal with duplicate events", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x7c17ce64eb97ebb2e0322595a30fc50b296f9cec391c276410bf2d1a459ff9cf",
      selfAddress: "Ethereum/0x213fe7e177160991829a4d0a598a848d2448f384",
    });
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
  });

  it("should handle a SAI borrow", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x39ac4111ceaac95a9eee278b05ca38db3142a188bb33d5aa1c646546fc8d31c6",
      selfAddress: "Ethereum/0x213fe7e177160991829a4d0a598a848d2448f384",
    });
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Borrow);
  });

  it("should handle a SAI repayment", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xce0ac042673100eb6ad329a5996aa52c43d1f882a0d93bb5607c5a6d27b1014a",
      selfAddress: "Ethereum/0x213fe7e177160991829a4d0a598a848d2448f384",
    });
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Repay);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Fee);
  });

  it("should handle a SAI cage cashout", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xa2920b7319c62fa7d2bf5072a292972fe74af5f452d905495da1fb0d28bba86b",
      selfAddress: "Ethereum/0x50509324beedeaf5ae19186a6cc2c30631a98d97",
    });
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should parse a repayment w fee paid in SAI", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x5919e3da5827d30bc63c8b3023ccefa8d7691fe2d442cab1a18c121fc791200a",
      selfAddress: "Ethereum/0xfdbbfb0fe2986672af97eca0e797d76a0bbf35c9",
    });
    expect(tx.transfers.length).to.equal(5);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[3].category).to.equal(TransferCategories.Repay);
    expect(tx.transfers[4].category).to.equal(TransferCategories.Fee);
  });

  it("should parse a CDP deposit via proxy", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x26e7fb1c36992b85d764e8b8ffba44356013e2713b421e190277e05a785716d0",
      selfAddress: "Ethereum/0xa1700938bd2943abfb923d67054287d07bd0cd30",
    });
    expect(tx.transfers.length).to.equal(6);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[3].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[4].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[5].category).to.equal(TransferCategories.Internal);
  });

  it("should parse a CDP repay + withdraw via proxy", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x30e97ec8235ae69d24873e5596fb708d0622ea817a468ab7111f926a6f9c3387",
      selfAddress: "Ethereum/0x452e1928aa6c88e690f26ea08ec119bf816c8568",
    });
    expect(tx.transfers.length).to.equal(5);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Repay);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[3].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[4].category).to.equal(TransferCategories.SwapIn);
  });

});
