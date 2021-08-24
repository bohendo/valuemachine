import { Guards } from "@valuemachine/types";

import {
  parsePolygonTx,
  expect,
  testLogger,
} from "../testUtils";

const source = "Quickswap";
const logger = testLogger.child({ module: `Test${source}` }, {
  // level: "debug",
});

describe(source, () => {
  it("should handle a swap", async () => {
    const tx = await parsePolygonTx({
      selfAddress: "0x8266c20cb25a5e1425cb126d78799b2a138b6c46",
      hash: "0xfbf4af6a377016d3b2ce8cd413f83487954723dafd9b7ad70079b0276209958a",
      logger,
    });
    expect(tx.sources).to.include(Guards.Polygon);
    expect(tx.apps).to.include(source);
    expect(tx.method).to.match(/swap/i);
  });
});

