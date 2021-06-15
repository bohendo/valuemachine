import { hexZeroPad } from "@ethersproject/bytes";
import { parseUnits } from "@ethersproject/units";
import {
  Assets,
  Transactions,
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";

import { getTransactions } from "../../index";
import {
  AddressOne,
  expect,
  getTestAddressBook,
  getTestChainData,
  getTestEthCall,
  getTestEthTx,
  testLogger,
} from "../testUtils";

import { wethAddresses } from "./weth";

const source = TransactionSources.Weth;
const { SwapIn, SwapOut } = TransferCategories;
const log = testLogger.child({
  // level: "debug",
  module: "TestTransactions",
});
const toBytes32 = (decstr: string): string => hexZeroPad(parseUnits(decstr, 18), 32);

describe(source, () => {
  let addressBook;
  let txns: Transactions;
  const quantity = "3.14";
  const quantityHex = toBytes32(quantity);
  const sender = AddressOne;
  const wethAddress = wethAddresses[0].address;

  beforeEach(() => {
    addressBook = getTestAddressBook();
    txns = getTransactions({ addressBook, logger: log });
    expect(txns.getJson().length).to.equal(0);
  });

  // eg 0xcf4a5bff7c60f157b87b8d792c99e9e5c0c21c6122b925766e646c5f293a49f9
  it("should parse a weth deposit", async () => {
    txns.mergeEthereum(getTestChainData([
      getTestEthTx({ from: sender, to: wethAddress, value: quantity, logs: [{
        address: wethAddress,
        data: quantityHex,
        index: 5,
        topics: [
          "0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c",
          `0x000000000000000000000000${sender.replace("0x", "")}`,
        ]
      }] }),
    ]));
    expect(txns.getJson().length).to.equal(1);
    const tx = txns.getJson()[0];
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(3);
    const swapOut = tx.transfers[1];
    expect(swapOut.asset).to.equal(Assets.ETH);
    expect(swapOut.category).to.equal(SwapOut);
    expect(swapOut.from).to.equal(sender);
    expect(swapOut.to).to.equal(wethAddress);
    expect(swapOut.quantity).to.equal(quantity);
    const swapIn = tx.transfers[2];
    expect(swapIn.asset).to.equal(Assets.WETH);
    expect(swapIn.category).to.equal(SwapIn);
    expect(swapIn.from).to.equal(wethAddress);
    expect(swapIn.to).to.equal(sender);
    expect(swapIn.quantity).to.equal(quantity);
  });

  // eg 0x6bd79c3ef5947fe0e5f89f4060eca295277b949dcbd849f69533ffd757ac1bcd
  it("should parse a weth withdrawal", async () => {
    txns.mergeEthereum(getTestChainData([
      getTestEthTx({ from: sender, to: wethAddress, logs: [{
        address: wethAddress,
        index: 5,
        data: quantityHex,
        topics: [
          "0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65",
          `0x000000000000000000000000${sender.replace("0x", "")}`,
        ]
      }] }),
    ], [
      getTestEthCall({
        contractAddress: "0x0000000000000000000000000000000000000000",
        from: wethAddress,
        to: sender,
        value: quantity,
      }),
    ]));
    expect(txns.getJson().length).to.equal(1);
    const tx = txns.getJson()[0];
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(3);
    const swapOut = tx.transfers[1];
    expect(swapOut.asset).to.equal(Assets.WETH);
    expect(swapOut.category).to.equal(SwapOut);
    expect(swapOut.from).to.equal(sender);
    expect(swapOut.to).to.equal(wethAddress);
    expect(swapOut.quantity).to.equal(quantity);
    const swapIn = tx.transfers[2];
    expect(swapIn.asset).to.equal(Assets.ETH);
    expect(swapIn.category).to.equal(SwapIn);
    expect(swapIn.from).to.equal(wethAddress);
    expect(swapIn.to).to.equal(sender);
    expect(swapIn.quantity).to.equal(quantity);
  });

});

