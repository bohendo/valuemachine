import {
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";

import {
  parseEthTx,
  expect,
  testLogger,
} from "../testUtils";

const source = TransactionSources.Polygon;
const logger = testLogger.child({ module: `Test${source}`,
  // level: "debug",
});

describe("Polygon Bridge", () => {

  it("should handle zap bridge to matic", async () => {
    const tx = await parseEthTx({
      selfAddress: "0xada083a3c06ee526f827b43695f2dcff5c8c892b",
      hash: "0xafe41962f39cf25034aecd3f3278e8f7ed0b4dc60e612c10c68c8599a29dad45",
      logger,
    });
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(6);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Expense);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[3].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[4].category).to.equal(TransferCategories.SwapIn);
    expect(tx.transfers[5].category).to.equal(TransferCategories.Deposit);
  });

  it("should handle plasma bridge to matic", async () => {
    const tx = await parseEthTx({
      selfAddress: "0x8266c20cb25a5e1425cb126d78799b2a138b6c46",
      hash: "0x08d2277c687bbe4e3bd3baf27ef4c7b2a97f2fb282c72f7eff211c5d16f7e02b",
      logger,
    });
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Expense);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Deposit);
  });

});
