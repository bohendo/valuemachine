import { hexZeroPad } from "@ethersproject/bytes";
import { parseUnits } from "@ethersproject/units";
import { Transactions, TransactionSources, TransferCategories } from "@valuemachine/types";

import {
  AddressOne,
  AddressTwo,
  expect,
  testLogger,
  testToken as tokenAddress,
  getTestAddressBook,
  getTestChainData,
  getTestEthCall,
  getTestEthTx,
} from "../testUtils";
import { getTransactions } from "../../index";

const source = TransactionSources.ERC20;
const log = testLogger.child({ module: `Test${source}` });
const toBytes32 = (decstr: string): string => hexZeroPad(parseUnits(decstr, 18), 32);

describe(source, () => {
  let addressBook;
  let txns: Transactions;
  const quantity = "3.14";
  const quantityHex = toBytes32(quantity);
  const sender = AddressOne;
  const recipient = AddressTwo;

  beforeEach(() => {
    addressBook = getTestAddressBook();
    txns = getTransactions({ addressBook, logger: log });
  });

  it("should parse eth calls w/out generating dups", async () => {
    const chainData = getTestChainData([
      getTestEthTx({ from: sender, to: recipient, value: "0.2" })
    ], [
      getTestEthCall({ from: recipient, to: sender, value: "0.4" }),
      getTestEthCall({ from: sender, to: recipient, value: "0.1" }),
      getTestEthCall({ from: sender, to: recipient, value: "0.1" }),
    ]);
    expect(txns.getJson().length).to.equal(0);
    txns.mergeEthereum(chainData);
    expect(txns.getJson().length).to.equal(1);
    expect(txns.getJson()[0].transfers.length).to.equal(5);
    // Run again to ensure no dups are generated
    txns.mergeEthereum(chainData);
    expect(txns.getJson().length).to.equal(1);
    expect(txns.getJson()[0].transfers.length).to.equal(5);
  });

  it("should parse erc20 transfers", async () => {
    const chainData = getTestChainData([
      getTestEthTx({ from: sender, to: tokenAddress, logs: [
        {
          address: tokenAddress,
          data: quantityHex,
          index: 100,
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            `0x000000000000000000000000${sender.replace("0x", "")}`,
            `0x000000000000000000000000${recipient.replace("0x", "")}`
          ]
        }
      ] })
    ]);
    expect(txns.getJson().length).to.equal(0);
    txns.mergeEthereum(chainData);
    expect(txns.getJson().length).to.equal(1);
    expect(txns.getJson()[0].sources).to.include(source);
    expect(txns.getJson()[0].transfers.length).to.equal(2);
    const tokenTransfer = txns.getJson()[0].transfers[1];
    expect(tokenTransfer.asset).to.equal(addressBook.getName(tokenAddress));
    expect(tokenTransfer.quantity).to.equal(quantity);
    expect(tokenTransfer.from).to.equal(sender);
    expect(tokenTransfer.to).to.equal(recipient);
    expect(tokenTransfer.category).to.equal(TransferCategories.Internal);
    // Run again to ensure no dups are generated
    txns.mergeEthereum(chainData);
    expect(txns.getJson().length).to.equal(1);
    expect(txns.getJson()[0].transfers.length).to.equal(2);
  });

  it("should parse erc20 approvals", async () => {
    const chainData = getTestChainData([
      getTestEthTx({ from: sender, to: tokenAddress, logs: [
        {
          address: tokenAddress,
          data: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
          index: 10,
          topics: [
            "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
            `0x000000000000000000000000${sender.replace("0x", "")}`,
            `0x000000000000000000000000${recipient.replace("0x", "")}`
          ]
        },
      ] })
    ]);
    expect(txns.getJson().length).to.equal(0);
    txns.mergeEthereum(chainData);
    expect(txns.getJson().length).to.equal(1);
    const tx = txns.getJson()[0];
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(1);
  });

});
