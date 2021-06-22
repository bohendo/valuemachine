import {
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";

import {  } from "../parser";
import {
  expect,
  parseEthTx,
  testLogger,
} from "../testUtils";

const source = TransactionSources.Tornado;
const { Expense, Deposit, Withdraw } = TransferCategories;
const logger = testLogger.child({
  // level: "debug",
  module: `Test${source}`,
});

describe(source, () => {
  it("should handle deposits to tornado", async () => {
    const tx = await parseEthTx({
      hash: "0x5e70e647a5dee8cc7eaddc302f2a7501e29ed00d325eaec85a3bde5c02abf1ec",
      selfAddress: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      logger,
    });
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(2);
    const deposit = tx.transfers[1];
    expect(deposit.category).to.equal(Deposit);
  });

  it("should handle withdraws from tornado", async () => {
    const tx = await parseEthTx({
      hash: "0xdd6beaa1dfed839747217c721696d81984e2507ef973cd3efb9e0cfe486a0b80",
      selfAddress: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
      logger,
      calls: [{
        from: "0xb541fc07bc7619fd4062a54d96268525cbc6ffef",
        to: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
        value: "0.079"
      }]
    });
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(2);
    const fee = tx.transfers[0];
    expect(fee.category).to.equal(Expense);
    const deposit = tx.transfers[1];
    expect(deposit.category).to.equal(Withdraw);
  });

});


