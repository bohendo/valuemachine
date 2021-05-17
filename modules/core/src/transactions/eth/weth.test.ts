import { hexZeroPad } from "@ethersproject/bytes";
import { parseUnits } from "@ethersproject/units";
import {
  AssetTypes,
  Transactions,
  TransactionSources,
  TransferCategories,
} from "@finances/types";
import { expect } from "@finances/utils";

import {
  AddressOne,
  getTestChainData,
  getTestEthTx,
  getTestEthCall,
  getTestAddressBook,
  testLogger,
} from "../../testing";
import { getTransactions } from "../index";

import { wethAddresses } from "./weth";

const log = testLogger.child({ module: "TestTransactions" });
const toBytes32 = (decstr: string): string => hexZeroPad(parseUnits(decstr, 18), 32);

describe(TransactionSources.Weth, () => {
  let addressBook;
  let txns: Transactions;
  const quantity = "3.14";
  const quantityHex = toBytes32(quantity);
  const sender = AddressOne;
  const wethAddress = wethAddresses[0].address;

  beforeEach(() => {
    addressBook = getTestAddressBook();
    txns = getTransactions({ addressBook, logger: log });
    expect(txns.json.length).to.equal(0);
  });

  // eg 0xcf4a5bff7c60f157b87b8d792c99e9e5c0c21c6122b925766e646c5f293a49f9
  it("should parse a weth deposit", async () => {
    txns.mergeChainData(getTestChainData([
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
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.sources).to.include(TransactionSources.Weth);
    expect(tx.transfers.length).to.equal(2);
    expect(tx.description.toLowerCase()).to.include("swap");
    expect(tx.description).to.include(addressBook.getName(sender));
    expect(tx.description).to.include(quantity);
    const swapOut = tx.transfers[0];
    expect(swapOut.assetType).to.equal(AssetTypes.ETH);
    expect(swapOut.category).to.equal(TransferCategories.SwapOut);
    expect(swapOut.from).to.equal(sender);
    expect(swapOut.to).to.equal(wethAddress);
    expect(swapOut.quantity).to.equal(quantity);
    const swapIn = tx.transfers[1];
    expect(swapIn.assetType).to.equal(AssetTypes.WETH);
    expect(swapIn.category).to.equal(TransferCategories.SwapIn);
    expect(swapIn.from).to.equal(wethAddress);
    expect(swapIn.to).to.equal(sender);
    expect(swapIn.quantity).to.equal(quantity);
  });

  // eg 0x6bd79c3ef5947fe0e5f89f4060eca295277b949dcbd849f69533ffd757ac1bcd
  it("should parse a weth withdrawal", async () => {
    txns.mergeChainData(getTestChainData([
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
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.sources).to.include(TransactionSources.Weth);
    expect(tx.transfers.length).to.equal(3);
    expect(tx.description.toLowerCase()).to.include("swap");
    expect(tx.description).to.include(addressBook.getName(sender));
    expect(tx.description).to.include(quantity);
    const swapOut = tx.transfers[1];
    expect(swapOut.assetType).to.equal(AssetTypes.WETH);
    expect(swapOut.category).to.equal(TransferCategories.SwapOut);
    expect(swapOut.from).to.equal(sender);
    expect(swapOut.to).to.equal(wethAddress);
    expect(swapOut.quantity).to.equal(quantity);
    const swapIn = tx.transfers[2];
    expect(swapIn.assetType).to.equal(AssetTypes.ETH);
    expect(swapIn.category).to.equal(TransferCategories.SwapIn);
    expect(swapIn.from).to.equal(wethAddress);
    expect(swapIn.to).to.equal(sender);
    expect(swapIn.quantity).to.equal(quantity);
  });

});

