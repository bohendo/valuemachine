import {
  TransferCategories,
} from "@valuemachine/types";

import {
  parseEthTx,
  expect,
  testLogger,
} from "./testUtils";

import { aaveSource } from "./aave";

const { Expense, SwapIn, SwapOut, Borrow, Repay } = TransferCategories;
const logger = testLogger.child({ module: `Test${aaveSource}`,
  // level: "debug", // Uncomment to enable verbose logging
});

describe(aaveSource, () => {
  it("should handle deposits to v2", async () => {
    const tx = await parseEthTx({
      selfAddress: "0x7d12d0d36f8291e8f7adec4cf59df6cc01d0ab97",
      hash: "0x23219928262c3933be579182cf8b466585b84d5e249413d3c9613837d51393e0",
      logger,
    });
   // expect(tx.sources).to.include(aaveSource);
    expect(tx.transfers.length).to.equal(3);
    const fee = tx.transfers[0];
    expect(fee.category).to.equal(Expense);
	const deposit = tx.transfers[1];
    expect(deposit.category).to.equal(SwapOut);
	const aToken = tx.transfers[2];
    expect(aToken.category).to.equal(SwapIn);
  });
  it("should handle withdrawals from v2", async () => {
    const tx = await parseEthTx({
      selfAddress: "0x6486b700896ff5ce5c7e82fded5726b1e6b0d684",
      hash: "0x935b03ead833153e9d3ef70ec1b9d7afa52ee1e649ae3e0b40ceeefbfd6c0ff7",
      logger,
    });
   // expect(tx.sources).to.include(aaveSource);
    expect(tx.transfers.length).to.equal(3);
    const fee = tx.transfers[0];
    expect(fee.category).to.equal(Expense);
	const deposit = tx.transfers[1];
    expect(deposit.category).to.equal(SwapIn);
	const aToken = tx.transfers[2];
    expect(aToken.category).to.equal(SwapOut);
  });
  it("should handle borrow from v2", async () => {
    const tx = await parseEthTx({
      selfAddress: "0xd755578cb8b9e369803fe08b7d875287914a3d3c",
      hash: "0x35ba26bed72135327d5e58ca4386b372569a172c03087fc02aa6708e01ea3a1b",
      logger,
    });
   // expect(tx.sources).to.include(aaveSource);
    expect(tx.transfers.length).to.equal(2);
    const fee = tx.transfers[0];
    expect(fee.category).to.equal(Expense);
	const borrow = tx.transfers[1];
    expect(borrow.category).to.equal(Borrow);
  });
  it.skip("should handle repay to v2", async () => {
    const tx = await parseEthTx({
      selfAddress: "0xcb9649e80d15f3aa2993a691a73c7ed29e47df63",
      hash: "0x2372a971883af89814f3ed1a6fe89c19b3e7d6945445552f74da11033a9af5ed",
      logger,
    });
   // expect(tx.sources).to.include(aaveSource);
    expect(tx.transfers.length).to.equal(2);
    const fee = tx.transfers[0];
    expect(fee.category).to.equal(Expense);
	const repay = tx.transfers[1];
    expect(repay.category).to.equal(Repay);
  });	
  it("should handle staking aave", async () => {
    const tx = await parseEthTx({
      selfAddress: "0xa2abefa52cf5807c609abe184ea0b7097edb1d22",
      hash: "0xbb2951265111c2804ae286a33375657b9e1b49aa8c0b925b5a72c15680d3a32c",
      logger,
    });
   // expect(tx.sources).to.include(aaveSource);
    expect(tx.transfers.length).to.equal(3);
    const fee = tx.transfers[0];
    expect(fee.category).to.equal(Expense);
	const swapIn= tx.transfers[1];
    expect(swapIn.category).to.equal(SwapIn);
	const swapOut = tx.transfers[2];
    expect(swapOut.category).to.equal(SwapOut);
  });
  it("should handle unstaking aave", async () => {
    const tx = await parseEthTx({
      selfAddress: "0x357dd5ccd7ca5f0379671940d08c40110b407848",
      hash: "0x61499d92d5161a9e5fd379b3336926664a33453f2c9a17d5bd8b081203274ddf",
      logger,
    });
   // expect(tx.sources).to.include(aaveSource);
    expect(tx.transfers.length).to.equal(3);
    const fee = tx.transfers[0];
    expect(fee.category).to.equal(Expense);
	const swapIn= tx.transfers[2];
    expect(swapIn.category).to.equal(SwapIn);
	const swapOut = tx.transfers[1];
    expect(swapOut.category).to.equal(SwapOut);
  });
  
  
});
