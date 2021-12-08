import { expect } from "chai";

import { Guards } from "../../enums";
import { getTransactionsError } from "../../utils";
import {
  env,
  getTestAddressBook,
  testStore,
  testLogger,
  parsePolygonTx,
} from "../testUtils";
import { EvmData } from "../types";

import { getPolygonData } from "./manager";

const logger = testLogger.child({ module: "TestPolygonData" }, { level: "info" });

describe.skip("Polygon Data Manager", () => {
  let polygonData: EvmData;
  const testAddress = "0xada083a3c06ee526F827b43695F2DcFf5C8C892B";
  const addressBook = getTestAddressBook(testAddress);
  beforeEach(() => {
    polygonData = getPolygonData({
      covalentKey: env.covalentKey,
      save: val => testStore.save("PolygonData", val),
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
