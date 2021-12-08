import { TransferCategories } from "../../../enums";
import { Apps } from "../../enums";
import { getParseTx, expect, testLogger } from "../../testUtils";

const appName = Apps.Argent;
const logger = testLogger.child({ module: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger });

describe(appName, () => {
  it("should parse SAI->DAI swap via argent maker manager", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x485e706c7b3b724610d6cd8c830d87d76b19be3afdd7782970292228a890bbde",
      selfAddress: "Ethereum/0xd17f934ee5dc7ee246eb2554078672ae3c9658c9",
      logger,
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers[0].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapIn);
  });
});
