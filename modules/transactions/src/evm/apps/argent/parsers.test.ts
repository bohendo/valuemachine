import { TransferCategories } from "@valuemachine/types";

import {
  parseEthTx,
  expect,
  testLogger,
} from "../testUtils";

const source = "Argent";
const logger = testLogger.child({ module: `Test${source}` }, {
  // level: "debug",
});

describe(source, () => {
  it("should parse SAI->DAI swap via argent maker manager", async () => {
    const tx = await parseEthTx({
      hash: "0x485e706c7b3b724610d6cd8c830d87d76b19be3afdd7782970292228a890bbde",
      selfAddress: "0xd17f934ee5dc7ee246eb2554078672ae3c9658c9",
      logger,
    });
    expect(tx.apps).to.include(source);
    expect(tx.transfers[0].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapIn);
  });
});
