import { expect } from "chai";

import { TransferCategories } from "../../../enums";
import { Apps, Methods } from "../../enums";
import { getParseTx, testLogger } from "../../testUtils";

const appName = Apps.Yearn;
const logger = testLogger.child({ name: `Test${appName}` }, { level: "warn" });
const parseTx = getParseTx({ logger });

describe(appName, () => {

  it("should parse a yearn deposit", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x92fa277dc5b620234c0c919533622ab2bef3e5c6fb56f27cc9d13cff9a7ae5e7",
      selfAddress: "Ethereum/0x0979b13d93a61562cea2149264ce709d05c82b55",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should parse a yearn withdraw", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x73762d63081ca3139a0a822236d87d02663100b62ba85ae76fc8bf17c46f56e2",
      selfAddress: "Ethereum/0x6f76019451b4e379e89ef4421ac6dea3e9ec89f2",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(TransferCategories.SwapOut);
    expect(tx.transfers[2].category).to.equal(TransferCategories.SwapIn);
  });

  it("should parse a yGov deposit", async () => { // deposit
    const tx = await parseTx({
      txid: "Ethereum/0x6afbee7183e3bf248ef32e4776723101b693cc30eafbed0eedabeada07f68bcd",
      selfAddress: "Ethereum/0x09ea768029069eeb979015a64f261e7789e5e450",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
  });

  it("should parse a yGov withdrawal", async () => { // withdraw
    const tx = await parseTx({
      txid: "Ethereum/0x1d88235000b0beecef8f91d96091632074626b2677fe83b8796a36fffa4d1f76",
      selfAddress: "Ethereum/0x09ea768029069eeb979015a64f261e7789e5e450",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
  });

  it("should parse a yGov registration", async () => { // withdraw
    const tx = await parseTx({
      txid: "Ethereum/0x57a9dd966cdf2289bc4cd68f66e7fa72918d37919d51b7998b844f710b026de2",
      selfAddress: "Ethereum/0x09ea768029069eeb979015a64f261e7789e5e450",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.include(Methods.Registration);
  });

  it("should parse a yGov exit", async () => { // withdraw
    const tx = await parseTx({
      txid: "Ethereum/0x094536c4911eea329b3b9d890be4a27637d8d011612c9a37e66042b5f29ba2bd",
      selfAddress: "Ethereum/0x49a8d81868f2acb9a6368bc0ef994cb988f17407",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Income);
  });

});
