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
const log = testLogger.child({ module: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger: log });

describe(appName, () => {
  it.skip("should handle birthing your own kitty", async () => {});

  it("should handle a transfer", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x600fbd0e7da8a612a6b825f450c2cc71827dc864e88d91e8c506eb7e1f41fb8c",
      selfAddress: "Ethereum/0x213fE7E177160991829a4d0a598a848D2448F384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Transfer);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Expense);
  });

  it("should handle breeding kitties", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xe01eda5e249ab0a128a3c00b83d973104da5b86eb6e85238bf0705a2a59b1b4c",
      selfAddress: "Ethereum/0x213fE7E177160991829a4d0a598a848D2448F384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.equal(Methods.Breed);
    expect(tx.transfers.length).to.equal(2);
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
    expect(tx.method).to.include(Methods.GetBirth);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[0].from).to.include(appName);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[1].to).to.include(appName);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[2].from).to.include(appName);
  });

  it("should handle birthing someone else's kitty", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x802a954d11e2a534edd30ae0ee914e805e70fa4b6e4922727ce3134cce307e0b",
      selfAddress: "Ethereum/0xD51b5990951622c15de735F8510C7dBD6d3d3804",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.GiveBirth);
    expect(tx.transfers.length).to.equal(5);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Income);
    expect(tx.transfers[1].to).to.include(appName);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Income);
    expect(tx.transfers[2].to).to.include(appName);
    expect(tx.transfers[3].category).to.equal(TransferCategories.Income);
    expect(tx.transfers[3].to).to.include(appName);
    expect(tx.transfers[4].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[4].from).to.include(appName);
  });

  it("should handle creating a sale auction", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x57560539b9879c76c8fb3799f040062e94b41505993554bfae9c3a4e61b630a1",
      selfAddress: "Ethereum/0x213fE7E177160991829a4d0a598a848D2448F384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Auction);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[1].to).to.include(appName);
  });

  it("should handle a purchase", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x19fedd170b4c00dd109ec403704787f6ddefdfc6ee49499395b9741f35f1a587",
      selfAddress: "Ethereum/0x213fE7E177160991829a4d0a598a848D2448F384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.equal(Methods.Purchase);
    expect(tx.transfers.length).to.equal(4);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Refund);
    expect(tx.transfers[3].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle a sale", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x2a4601c2b909660c6358b212192e73464ed4abdf3f2f3ecafa87ce7213df8b4a",
      selfAddress: "Ethereum/0x213fE7E177160991829a4d0a598a848D2448F384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Sale);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[0].to).to.include(appName);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[1].from).to.include(appName);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[2].from).to.include(appName);
    expect(tx.transfers[2].asset).to.equal(tx.transfers[0].asset);
  });

  it("should handle cancelling a sale auction", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xedb22fa6fb0e4f8ec9761d2e87616fc2f5759c2b6e4d9a8a9ce32237df922087",
      selfAddress: "Ethereum/0x377De8fCE168AF3b045e4bA51e819695f9A058A7",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Cancel);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[1].from).to.include(appName);
  });

  it("should handle creating a sire auction", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xe0e7fe926a67814c6631240a1c5588793b154d8d00a1a810c260e56f9e8b7a1f",
      selfAddress: "Ethereum/0x4317ea812eb8e294a96874d23dee6a2c1eafc574",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Auction);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[1].to).to.include(appName);
  });

  it("should handle a successful sire purchase", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x91d5f628bdc5be86f8992a087084c60dee3f6cefe66b34ca8a7f08c83d078e9d",
      selfAddress: "Ethereum/0x7397b8b8d05de2fad38dfcc5dde2a973593417ef",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Breed);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[1].to).to.include(appName);
  });

  it("should handle a successful sire sale", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x91d5f628bdc5be86f8992a087084c60dee3f6cefe66b34ca8a7f08c83d078e9d",
      selfAddress: "Ethereum/0x6d661d032809d52e42786ef9a0ae0948db89e38a",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Sale);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Income);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[1].from).to.include(appName);
  });

  it("should handle cancelling a sire auction", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xa1171d23a3a5c2d245100527771695661035aef2bfbb236204dedcf596925b7c",
      selfAddress: "Ethereum/0xa9d8c85c30eec96b9330f18ed932596c002e60c5",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Cancel);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[1].from).to.include(appName);
  });

});

