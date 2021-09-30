import {
  TransferCategories,
} from "@valuemachine/types";

import { Apps, Methods } from "../../enums";
import {
  getParseTx,
  expect,
  testLogger,
} from "../../testUtils";

const appName = Apps.NFT;
const logger = testLogger.child({ module: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger });

describe(appName, () => {

  it("should parse giving an nft", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x0844a70ddd05cec956532141cfdea9323c904de4bd63a6d8eecc8c03c651a251",
      selfAddress: "Ethereum/0x213fe7e177160991829a4d0a598a848d2448f384",
    });
    expect(tx.transfers.length).to.equal(2);
    expect(tx.method).to.include(Methods.Transfer);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Expense);
  });

  it("should parse getting an nft", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x0844a70ddd05cec956532141cfdea9323c904de4bd63a6d8eecc8c03c651a251",
      selfAddress: "Ethereum/0x1057bea69c9add11c6e3de296866aff98366cfe3",
    });
    expect(tx.transfers.length).to.equal(1);
    expect(tx.method).to.include(Methods.Transfer);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Income);
  });

  it("should parse buying an nft", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x615dfda5b9b8c600bd3d8e579672fdc31dd76c4e417ca2649ea063d835208f31",
      selfAddress: "Ethereum/0x1057bea69c9add11c6e3de296866aff98366cfe3",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.method).to.be.a("string");
    expect(tx.method).to.include(Methods.Trade);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should parse selling an nft", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x615dfda5b9b8c600bd3d8e579672fdc31dd76c4e417ca2649ea063d835208f31",
      selfAddress: "Ethereum/0x5EAC09dc8987309F53e72A761EA60b448F3224dD",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.method).to.be.a("string");
    expect(tx.method).to.include(Methods.Trade);
    expect(tx.transfers[0].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapIn);
  });

});
