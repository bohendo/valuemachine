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

describe.skip(appName, () => {

  it("should parse giving an nft", async () => {
    const tx = await parseTx({
      txid: "Ethereum/",
      selfAddress: "Ethereum/",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.method).to.equal(Methods.Transfer);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Expense);
  });

  it("should parse getting an nft", async () => {
    const tx = await parseTx({
      txid: "Ethereum/",
      selfAddress: "Ethereum/",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.method).to.equal(Methods.Transfer);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Expense);
  });

});
