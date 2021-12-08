import { expect } from "chai";

import { TransferCategories } from "../../../enums";
import { Apps } from "../../enums";
import { getParseTx, testLogger } from "../../testUtils";

const appName = Apps.Dai;
const log = testLogger.child({ module: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger: log });

describe(appName, () => {

  it("should handle a SAI to DAI migration", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x20de49f7742cd25eaa75b4d09158f45b72ff7d847a250b4b60c9f33ac00bd759",
      selfAddress: "Ethereum/0x1057bea69c9add11c6e3de296866aff98366cfe3",
    });
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should handle a DAI deposit to DSR", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x622431660cb6ee607e12ad077c8bf9f83f5f8cf495dbc919d55e9edcaebe22e0",
      selfAddress: "Ethereum/0x1057bea69c9add11c6e3de296866aff98366cfe3",
    });
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
  });

  it("should parse a DAI repay + withdraw via proxy", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x30e97ec8235ae69d24873e5596fb708d0622ea817a468ab7111f926a6f9c3387",
      selfAddress: "Ethereum/0x452e1928aa6c88e690f26ea08ec119bf816c8568",
    });
    log.info(tx);
    expect(tx.transfers.length).to.equal(5);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Repay);
    expect(tx.transfers[1].to).to.include(appName);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[2].from).to.include(appName);
    expect(tx.transfers[3].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[4].category).to.equal(TransferCategories.SwapIn);
  });

});
