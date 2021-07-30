import { Guards, TransferCategories } from "@valuemachine/types";

import {
  expect,
  testLogger,
  parsePolygonTx,
} from "../testUtils";

const logger = testLogger.child({ module: `TestPolygon`,
  // level: "debug",
});

describe("Polygon Aave", () => {
  it.skip("should handle a deposit", async () => {
    const tx = await parsePolygonTx({
      selfAddress: "0xada083a3c06ee526F827b43695F2DcFf5C8C892B",
      hash: "0x292ec1392e758f33e77bd077334b413e5337f86698e99396befc123f8579f9fa",
      logger,
    });
    expect(tx.sources).to.include(Guards.MATIC);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Expense);
    expect(tx.transfers[0].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[0].category).to.equal(TransferCategories.SwapIn);
  });
});
