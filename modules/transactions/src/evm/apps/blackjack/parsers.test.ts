import { TransferCategories } from "../../../enums";
import { Apps, Methods } from "../../enums";
import {
  getParseTx,
  expect,
  testLogger,
} from "../../testUtils";

const appName = Apps.Blackjack;
const log = testLogger.child({ module: `Test${appName}` }, { level: "info" });
const parseTx = getParseTx({ logger: log });

describe(appName, () => {

  it("should handle a v1 deposit", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xaf24b14308013aab253a7e3abbc35ee3ad971371d476fee0cfbd39dcbee465e9",
      selfAddress: "Ethereum/0x213fe7e177160991829a4d0a598a848d2448f384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.equal(Methods.Deposit);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
  });

  it("should handle a v1 withdraw", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0xb09182b5687fa2dee5b216f2b719fa3a66e27117767de0868b8129c6db986687",
      selfAddress: "Ethereum/0x213fe7e177160991829a4d0a598a848d2448f384",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.equal(Methods.Withdraw);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Fee);
  });

  it("should handle a v1 self destruct", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x4a4771995b71469253c3c9eb861854059ce113709a4b2e0325bdff630aeef474",
      selfAddress: "Ethereum/0xeb56b369ddaa70034f94ba195f4377e895b919cf",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.equal(Methods.Withdraw);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[2].category).to.equal(TransferCategories.Fee);
  });

  it("should handle a v2 deposit", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x2c22e18f67642a22184354dc8f67bfc79103617f1f50e861bbd309606bbf0301",
      selfAddress: "Ethereum/0x1057Bea69c9ADD11c6e3dE296866AFf98366CFE3",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.equal(Methods.Deposit);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Fee);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Internal);
  });

  it("should handle a v2 withdraw", async () => {
    const tx = await parseTx({
      txid: "Ethereum/0x9f7342f3f37a9fa74857afd9c56e4a290af983758df8a937dcd78e2588ba6c4e",
      selfAddress: "Ethereum/0x1057Bea69c9ADD11c6e3dE296866AFf98366CFE3",
    });
    expect(tx.apps).to.include(appName);
    expect(tx.method).to.equal(Methods.Withdraw);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[0].category).to.equal(TransferCategories.Internal);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Fee);
  });

});

