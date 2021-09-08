import {
  TransferCategories,
} from "@valuemachine/types";

import {
  expect,
  parseEthTx,
  testLogger,
} from "../testUtils";

import { apps } from "./enums";

const appName = apps.Uniswap;
const logger = testLogger.child({ module: `Test${appName}` }, {
  // level: "debug",
});

describe(appName, () => {
  it("should handle a v1 swap", async () => {
    const tx = await parseEthTx({
      hash: "0x25e3f8798ff7f1e85f1ee5479d8e74c861ca97963a8356c9c6b7a6505b007423",
      selfAddress: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      logger,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle a v2 swap", async () => {
    const tx = await parseEthTx({
      hash: "0x6b4bd1513d3afe1e48c0ab10bbb14f2af5f2b6ca9b27d59f8a69612c3f0815bd",
      selfAddress: "0x56178a0d5f301baf6cf3e1cd53d9863437345bf9",
      logger,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method.toLowerCase()).to.include("trade");
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle a v2 swap w refund", async () => {
    const tx = await parseEthTx({
      hash: "0xd90c15854caed1994b5f4f617644d5cc742e03ebaa9e92b469ff4962e93a724e",
      selfAddress: "0xc3f289326cc63ca40e17deeca65553f36b047f6d",
      logger,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method.toLowerCase()).to.include("trade");
    expect(tx.transfers.length).to.equal(4);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[3].category).to.equal(TransferCategories.Refund);
  });

  it("should handle liquidity deposit to v2", async () => {
    const tx = await parseEthTx({
      hash: "0x24751ebed5fe45966c73858bcc01eab12d45d2ee6ff956c1c7cb31b8f89d3d15",
      selfAddress: "0xd0353030484a97ae850f7f35f5bc09797de792f2",
      logger,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method.toLowerCase()).to.include("supply liquidity");
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle liquidity withdrawal from v2", async () => {
    const tx = await parseEthTx({
      hash: "0x3377b07094bcf5f911ceeaf284bb2d4a2a56f8a316923890e47c07f71f111825",
      selfAddress: "0xfbb1068305c8ddd36f85d84880b2903d4b45e876",
      logger,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method.toLowerCase()).to.include("remove liquidity");
    expect(tx.transfers.length).to.equal(4);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[3].category).to.equal(TransferCategories.SwapIn);
  });

});
