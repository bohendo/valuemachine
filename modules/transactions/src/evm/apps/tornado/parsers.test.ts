import {
  TransferCategories,
} from "@valuemachine/types";

import {
  getParseTx,
  expect,
  testLogger,
} from "../../testUtils";

import { apps } from "./enums";

const appName = apps.Tornado;
const logger = testLogger.child({ module: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger });

describe(appName, () => {
  it("should handle deposits to tornado", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x5e70e647a5dee8cc7eaddc302f2a7501e29ed00d325eaec85a3bde5c02abf1ec",
      selfAddress: "Ethereum/0x1057bea69c9add11c6e3de296866aff98366cfe3",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    const deposit = tx.transfers[1];
    expect(deposit.category).to.equal(TransferCategories.Internal);
  });

  it("should handle withdraws from tornado", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xdd6beaa1dfed839747217c721696d81984e2507ef973cd3efb9e0cfe486a0b80",
      selfAddress: "Ethereum/0x1057bea69c9add11c6e3de296866aff98366cfe3",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
  });

});


