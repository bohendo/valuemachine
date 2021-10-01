import {
  TransferCategories,
} from "@valuemachine/types";

import { Apps, Methods } from "../../enums";
import {
  getParseTx,
  expect,
  testLogger,
} from "../../testUtils";

const appName = Apps.CryptoKitties;
const log = testLogger.child({ module: `Test${appName}` }, { level: "info" });
const parseTx = getParseTx({ logger: log });

describe.only(appName, () => {

  it("should handle a transfer", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x600fbd0e7da8a612a6b825f450c2cc71827dc864e88d91e8c506eb7e1f41fb8c",
      selfAddress: "Ethereum/0x213fE7E177160991829a4d0a598a848D2448F384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.method).to.include(Methods.Transfer);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Expense);
  });

  it("should handle breeding kitties", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xe01eda5e249ab0a128a3c00b83d973104da5b86eb6e85238bf0705a2a59b1b4c",
      selfAddress: "Ethereum/0x213fE7E177160991829a4d0a598a848D2448F384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.method).to.equal(Methods.Breed);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[1].to).to.include(appName);
  });

  it("should handle receiving a newly birthed kitty", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x802a954d11e2a534edd30ae0ee914e805e70fa4b6e4922727ce3134cce307e0b",
      selfAddress: "Ethereum/0x213fE7E177160991829a4d0a598a848D2448F384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.method).to.include(Methods.Birth);
    expect(tx.transfers[0].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[0].from).to.include(appName);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[1].to).to.include(appName);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[2].from).to.include(appName);
  });
  it.skip("should handle birthing someone else's kitty", async () => {});
  it.skip("should handle birthing your own kitty", async () => {});

  it("should handle a purchase", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x19fedd170b4c00dd109ec403704787f6ddefdfc6ee49499395b9741f35f1a587",
      selfAddress: "Ethereum/0x213fE7E177160991829a4d0a598a848D2448F384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(4);
    expect(tx.method).to.equal(Methods.Purchase);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Refund);
    expect(tx.transfers[3].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle creating a sale auction", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x57560539b9879c76c8fb3799f040062e94b41505993554bfae9c3a4e61b630a1",
      selfAddress: "Ethereum/0x213fE7E177160991829a4d0a598a848D2448F384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.method).to.include(Methods.Auction);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[1].to).to.include(appName);
  });
  it.skip("should handle cancelling a sale auction", async () => {});
  it.skip("should handle creating a sire auction", async () => {});
  it.skip("should handle cancelling a sire auction", async () => {});

  it.only("should handle a successful sale", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x2a4601c2b909660c6358b212192e73464ed4abdf3f2f3ecafa87ce7213df8b4a",
      selfAddress: "Ethereum/0x213fE7E177160991829a4d0a598a848D2448F384",
    });
    log.info(tx);
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.method).to.include(Methods.Sale);
    expect(tx.transfers[0].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[0].to).to.include(appName);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[1].from).to.include(appName);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[2].from).to.include(appName);
  });
  it.skip("should handle a successful sire", async () => {});

});

