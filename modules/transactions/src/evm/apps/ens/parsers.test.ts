import {
  TransferCategories,
} from "@valuemachine/types";

import { Apps, Methods } from "../../enums";
import {
  getParseTx,
  expect,
  testLogger,
} from "../../testUtils";

const appName = Apps.ENS;
const log = testLogger.child({ module: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger: log });

describe(appName, () => {

  it("should parse a bid on the old registrar", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xb111397d3979d15751032e58fc54a75229a6cf6a86a2a716375feb5d267a4c56",
      selfAddress: "Ethereum/0x557f0e214c8e8607a2c1E910802ACA23c6C0E72e",
    });
    log.info(tx);
    expect(tx).to.be.ok;
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Commit);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[1].to).to.include(appName);
  });

  it("should parse a bid reveal on the old registrar", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x19d2525fd7235e28c6e36f0abddbf457d8f84b954050f687906d56ba1147358e",
      selfAddress: "Ethereum/0x557f0e214c8e8607a2c1E910802ACA23c6C0E72e",
    });
    log.info(tx);
    expect(tx).to.be.ok;
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Reveal);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[1].from).to.include(appName);
  });

  it("should parse a registrar migration", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x73a4399c55e3d346cfd82f50cbe8949763dda6438b19fac979a7730e786b09e2",
      selfAddress: "Ethereum/0x557f0e214c8e8607a2c1E910802ACA23c6C0E72e",
    });
    log.info(tx);
    expect(tx).to.be.ok;
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Registration);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[1].from).to.include(appName);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Income);
  });

  it("should parse a bid on the new registrar", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x8930c0dd27b1ca4783bb35a6040fb8d748f2346c18be7bb9b982cef147f1840f",
      selfAddress: "Ethereum/0x1057Bea69c9ADD11c6e3dE296866AFf98366CFE3",
    });
    log.info(tx);
    expect(tx).to.be.ok;
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Registration);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[2].asset).to.include(appName);
  });

  it("should parse a registration w config on the new registrar", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x9c095aa9d5a9296716269ba3ff5de912f08e3a028983d99636ac6ec2ed78302d",
      selfAddress: "Ethereum/0x1057Bea69c9ADD11c6e3dE296866AFf98366CFE3",
    });
    log.info(tx);
    expect(tx).to.be.ok;
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Registration);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Refund);
    expect(tx.transfers[3].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[3].asset).to.include(appName);
  });

});
