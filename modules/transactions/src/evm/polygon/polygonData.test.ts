import { ChainData } from "@valuemachine/types";
import { getTransactionsError } from "@valuemachine/utils";

import { Guards } from "../../enums";
import {
  env,
  expect,
  getTestAddressBook,
  testStore,
  testLogger,
  parsePolygonTx,
} from "../testUtils";

import { getPolygonData } from "./polygonData";

const logger = testLogger.child({ module: `TestPolygon` }, {
  // level: "debug",
});

describe("Polygon Data", () => {
  let polygonData: ChainData;
  const testAddress = "0xada083a3c06ee526F827b43695F2DcFf5C8C892B";
  const addressBook = getTestAddressBook(testAddress);
  beforeEach(() => {
    polygonData = getPolygonData({
      covalentKey: env.covalentKey,
      store: testStore,
      logger,
    });
  });

  it("should create a polygon data manager", async () => {
    expect(polygonData).to.be.ok;
  });

  it("should sync & parse a transaction", async () => {
    const tx = await parsePolygonTx({
      selfAddress: testAddress,
      hash: "0x292ec1392e758f33e77bd077334b413e5337f86698e99396befc123f8579f9fa",
      logger,
    });
    expect(tx).to.be.ok;
    expect(tx.sources).to.include(Guards.Polygon);
    expect(getTransactionsError([tx])).to.be.null;
  });

  it.skip("should sync & parse an address book", async () => {
    await polygonData.syncAddressBook(addressBook);
    const transactions = polygonData.getTransactions(addressBook);
    expect(transactions[0].sources).to.include(Guards.Polygon);
    expect(getTransactionsError(transactions)).to.be.null;
  });

});
