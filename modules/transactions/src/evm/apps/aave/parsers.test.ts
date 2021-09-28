import {
  TransferCategories,
} from "@valuemachine/types";

import { EvmApps, TransactionSources } from "../../../enums";
import {
  getParseTx,
  expect,
  testLogger,
} from "../../testUtils";

const appName = EvmApps.Aave;
const logger = testLogger.child({ module: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger });

describe(appName, () => {

  it("should handle deposits to v2", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x23219928262c3933be579182cf8b466585b84d5e249413d3c9613837d51393e0",
      selfAddress: "Ethereum/0x7d12d0d36f8291e8f7adec4cf59df6cc01d0ab97",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle withdrawals from v2", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x935b03ead833153e9d3ef70ec1b9d7afa52ee1e649ae3e0b40ceeefbfd6c0ff7",
      selfAddress: "Ethereum/0x6486b700896ff5ce5c7e82fded5726b1e6b0d684",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle borrow from v2", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x35ba26bed72135327d5e58ca4386b372569a172c03087fc02aa6708e01ea3a1b",
      selfAddress: "Ethereum/0xd755578cb8b9e369803fe08b7d875287914a3d3c",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Borrow);
  });

  it("should handle repay to v2", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x2372a971883af89814f3ed1a6fe89c19b3e7d6945445552f74da11033a9af5ed",
      selfAddress: "Ethereum/0xcb9649e80d15f3aa2993a691a73c7ed29e47df63",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Repay);
  });

  it("should handle staking aave", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xbb2951265111c2804ae286a33375657b9e1b49aa8c0b925b5a72c15680d3a32c",
      selfAddress: "Ethereum/0xa2abefa52cf5807c609abe184ea0b7097edb1d22",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle unstaking aave", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x61499d92d5161a9e5fd379b3336926664a33453f2c9a17d5bd8b081203274ddf",
      selfAddress: "Ethereum/0x357dd5ccd7ca5f0379671940d08c40110b407848",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle a deposit on polygon", async () => {
    const tx = await parseTx({
      txid: "Polygon/0x292ec1392e758f33e77bd077334b413e5337f86698e99396befc123f8579f9fa",
      selfAddress: "Polygon/0xada083a3c06ee526F827b43695F2DcFf5C8C892B",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.sources).to.include(TransactionSources.Polygon);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[3].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[4].category).to.equal(TransferCategories.SwapIn);
  });

});
