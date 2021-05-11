import { HashZero } from "@ethersproject/constants";
import { ChainData, Transactions } from "@finances/types";
import { expect } from "@finances/utils";

import { AddressOne, AddressTwo, getTestChainData, getTestAddressBook, testLogger } from "../testing";
import { getTransactions } from "../index";

const log = testLogger.child({ module: "TestTransactions" });

const timestamp = "2018-01-02T01:00:00Z";
const value = "1.3141592653589793";

const exampleCoinbaseCsv =
`Timestamp,           Transaction Type,Asset,Quantity Transacted,      USD Spot Price at Transaction,USD Subtotal,USD Total (inclusive of fees),USD Fees,Notes
2018-01-01T01:00:00Z, Buy,             BTC,  0.1,                      1500.00,                      150.00,      165.00,                       15.00,   Bought 0.0300 BTC for $165.00 USD
${timestamp.replace("00Z", "30Z")}, Receive, ETH, ${value.substring(0, 10)},650.00,                  "",          "",                           "",      Received 1.0000 ETH from an external account
2018-01-03T01:00:00Z, Sell,            ETH,  1.0,                      600.00,                       600.00,      590.00,                       10.00,   Sold 1.0000 ETH for $590.00 USD
`.replace(/, +/g, ",");

// TODO: test ERC20 txns, make sure the zero-quantity transfer isn't preventing merge
describe("Coinbase", () => {
  let addressBook;
  let txns: Transactions;
  let chainData: ChainData;

  beforeEach(() => {
    addressBook = getTestAddressBook();
    txns = getTransactions({ addressBook, logger: log });
    chainData = getTestChainData([
      {
        block: 10,
        data: "0x",
        from: AddressOne,
        gasLimit: "0x100000",
        gasPrice: "0x100000",
        gasUsed: "0x1000",
        hash: HashZero,
        index: 1,
        logs: [],
        nonce: 0,
        status: 1,
        timestamp,
        to: AddressTwo,
        value,
      },
    ]);
  });

  it("should merge coinbase data multiple times without creaing duplicates", async () => {
    expect(txns.json.length).to.equal(0);
    txns.mergeCoinbase(exampleCoinbaseCsv);
    expect(txns.json.length).to.equal(3);
    txns.mergeCoinbase(exampleCoinbaseCsv);
    expect(txns.json.length).to.equal(3);
  });

  it("should merge coinbase receive/sends into a matching eth txn", async () => {
    expect(txns.json.length).to.equal(0);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    txns.mergeCoinbase(exampleCoinbaseCsv);
    expect(txns.json.length).to.equal(3);
    // Re-merging shouldn't insert any duplicates
    txns.mergeCoinbase(exampleCoinbaseCsv);
    expect(txns.json.length).to.equal(3);
  });

  it("should merge an eth txn into a matching coinbase receive/send", async () => {
    expect(txns.json.length).to.equal(0);
    txns.mergeCoinbase(exampleCoinbaseCsv);
    expect(txns.json.length).to.equal(3);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(3);
    // Re-merging shouldn't insert any duplicates
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(3);
  });

});

