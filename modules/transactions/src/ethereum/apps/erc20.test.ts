import { hexZeroPad } from "@ethersproject/bytes";
import { parseUnits } from "@ethersproject/units";
import { TransactionSources, TransferCategories } from "@valuemachine/types";

import { parseEthTx } from "../parser";
import {
  AddressOne,
  AddressTwo,
  expect,
  testLogger,
  testToken as tokenAddress,
  getTestAddressBook,
  getTestChainData,
  getTestEthTx,
} from "../testUtils";

const source = TransactionSources.ERC20;
const log = testLogger.child({ module: `Test${source}` });
const toBytes32 = (decstr: string): string => hexZeroPad(parseUnits(decstr, 18), 32);

describe(source, () => {
  let addressBook;
  const quantity = "3.14";
  const quantityHex = toBytes32(quantity);
  const sender = AddressOne;
  const recipient = AddressTwo;

  beforeEach(() => {
    addressBook = getTestAddressBook();
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
    const tx = parseEthTx(chainData.json.transactions[0], addressBook, chainData, log);
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(2);
    const tokenTransfer = tx.transfers[1];
    expect(tokenTransfer.asset).to.equal(addressBook.getName(tokenAddress));
    expect(tokenTransfer.quantity).to.equal(quantity);
    expect(tokenTransfer.from).to.equal(sender);
    expect(tokenTransfer.to).to.equal(recipient);
    expect(tokenTransfer.category).to.equal(TransferCategories.Internal);
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
    const tx = parseEthTx(chainData.json.transactions[0], addressBook, chainData, log);
    expect(tx.sources).to.include(source);
    expect(tx.transfers.length).to.equal(1);
  });

});
