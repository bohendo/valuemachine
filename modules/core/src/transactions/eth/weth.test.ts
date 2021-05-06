import { hexZeroPad } from "@ethersproject/bytes";
import { parseUnits } from "@ethersproject/units";
import { Transactions, TransferCategories } from "@finances/types";
import { expect } from "@finances/utils";

import {
  AddressOne,
  AddressTwo,
  getTestChainData,
  getTestEthTx,
  testAddressBook,
  testLogger,
} from "../testing";
import { getTransactions } from "../index";

import { wethAddresses } from "./weth";

const log = testLogger.child({ module: "TestTransactions" });
const toBytes32 = (decstr: string): string => hexZeroPad(parseUnits(decstr, 18), 32);

describe.skip("Weth", () => {
  let txns: Transactions;
  const quantity = "3.14";
  const quantityHex = toBytes32(quantity);
  const sender = AddressOne;
  const recipient = AddressTwo;
  const wethAddress = wethAddresses[0].address;

  beforeEach(() => {
    txns = getTransactions({ addressBook: testAddressBook, logger: log });
  });

  it("should parse a weth deposit", async () => {
    const chainData = getTestChainData([
      getTestEthTx({ to: wethAddresses, logs: [
        {
          address: wethAddress,
          data: quantityHex,
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            `0x000000000000000000000000${sender.replace("0x", "")}`,
            `0x000000000000000000000000${recipient.replace("0x", "")}`
          ]
        }
      ] }),
    ]);
    expect(txns.json.length).to.equal(0);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    expect(txns.json[0].tags).to.include("ERC20");
    expect(txns.json[0].transfers.length).to.equal(2);
    expect(txns.json[0].description.toLowerCase()).to.include("transfer");
    expect(txns.json[0].description).to.include(quantity);
    expect(txns.json[0].description).to.include(testAddressBook.getName(wethAddress));
    expect(txns.json[0].description).to.include(testAddressBook.getName(sender));
    expect(txns.json[0].description).to.include(testAddressBook.getName(recipient));
    const tokenTransfer = txns.json[0].transfers[1];
    expect(tokenTransfer.assetType).to.equal(testAddressBook.getName(wethAddress));
    expect(tokenTransfer.quantity).to.equal(quantity);
    expect(tokenTransfer.from).to.equal(sender);
    expect(tokenTransfer.to).to.equal(recipient);
    expect(tokenTransfer.category).to.equal(TransferCategories.Transfer);
    // Run again to ensure no dups are generated
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    expect(txns.json[0].transfers.length).to.equal(2);
  });

  it("should parse a weth withdrawal", async () => {
  });

});

