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
const logger = testLogger.child({ module: `Test${appName}` }, { level: "debug" });
const parseTx = getParseTx({ logger });

describe(appName, () => {

  it("should handle a breed", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xe01eda5e249ab0a128a3c00b83d973104da5b86eb6e85238bf0705a2a59b1b4c",
      selfAddress: "Ethereum/0x213fE7E177160991829a4d0a598a848D2448F384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.method).to.equal(Methods.Breed);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Expense);
  });

  it.skip("should handle a purchase", async () => {});
  it.skip("should handle a sale", async () => {});
  it.skip("should handle a birthing", async () => {});
});

