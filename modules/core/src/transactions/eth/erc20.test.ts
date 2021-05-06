import { hexZeroPad } from "@ethersproject/bytes";
import { parseUnits } from "@ethersproject/units";
import { Transactions } from "@finances/types";
import { expect } from "@finances/utils";

import {
  AddressOne,
  AddressTwo,
  getTestChainData,
  getTestEthCall,
  getTestEthTx,
  testAddressBook,
  testLogger,
  testToken,
} from "../testing";
import { getTransactions } from "../index";

const log = testLogger.child({ module: "TestTransactions" });

describe("Parse simple transfers", () => {
  let txns: Transactions;

  beforeEach(() => {
    txns = getTransactions({ addressBook: testAddressBook, logger: log });
  });

  it("should merge eth calls w/out generating dups", async () => {
    const chainData = getTestChainData([
      getTestEthTx({ from: AddressOne, to: AddressTwo, value: "0.2" })
    ], [
      getTestEthCall({ to: AddressOne, value: "0.4" }),
      getTestEthCall({ from: AddressOne, to: AddressTwo, value: "0.1" }),
      getTestEthCall({ from: AddressOne, to: AddressTwo, value: "0.1" }),
    ]);
    expect(txns.json.length).to.equal(0);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    expect(txns.json[0].transfers.length).to.equal(4);
    // Run again to ensure no dups are generated
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    expect(txns.json[0].transfers.length).to.equal(4);
  });

  it("should merge chain data w erc20 transfers successfully", async () => {
    const quantity = "3.14";
    const chainData = getTestChainData([
      getTestEthTx({
        from: AddressOne,
        to: testToken,
        logs: [
          {
            address: testToken,
            data: hexZeroPad(parseUnits(quantity, 18), 32),
            index: 100,
            topics: [
              "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
              `0x000000000000000000000000${AddressOne.replace("0x", "")}`,
              `0x000000000000000000000000${AddressTwo.replace("0x", "")}`
            ]
          }
        ],
      })
    ]);
    expect(txns.json.length).to.equal(0);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    expect(txns.json[0].tags).to.include("ERC20");
    expect(txns.json[0].transfers.length).to.equal(2);
    const tokenTransfer = txns.json[0].transfers[1];
    expect(tokenTransfer.assetType).to.equal(testAddressBook.getName(testToken));
    expect(tokenTransfer.quantity).to.equal(quantity);
    expect(tokenTransfer.from).to.equal(AddressOne);
    expect(tokenTransfer.to).to.equal(AddressTwo);
    // Run again to ensure no dups are generated
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    expect(txns.json[0].transfers.length).to.equal(2);
  });

});
