import { hexZeroPad } from "@ethersproject/bytes";
import { parseUnits } from "@ethersproject/units";
import { Transactions, TransferCategories } from "@finances/types";
import { expect } from "@finances/utils";

import {
  AddressOne,
  getTestChainData,
  getTestEthTx,
  testAddressBook,
  testLogger,
  testToken,
} from "../testing";
import { getTransactions } from "../index";

import { compoundV1 } from "./compound";

const log = testLogger.child({ level: "debug", module: "TestCompound" });

const toBytes32 = (decstr: string): string => hexZeroPad(parseUnits(decstr, 18), 32);

const rm0x = (str: string): string => str.replace(/^0x/, "");

describe.skip("Parse compound txns", () => {
  let txns: Transactions;
  const quantity = "3.14";
  const quantityHex = toBytes32(quantity);
  const sender = AddressOne;
  const compoundV1Address = compoundV1[0].address;

  beforeEach(() => {
    txns = getTransactions({ addressBook: testAddressBook, logger: log });
  });

  it("should handle deposits to compound v1", async () => {
    // Deposit a la 0x4bd1cb92d370a3b69b697e606e905d76a003b28c1605d2e46c9a887202b72ae0
    const chainData = getTestChainData([
      getTestEthTx({
        from: sender,
        to: compoundV1Address,
        hash: toBytes32("1"),
        logs: [
          {
            address: testToken,
            data: quantityHex,
            index: 10,
            topics: [
              "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
              `0x000000000000000000000000${rm0x(sender)}`,
              `0x000000000000000000000000${rm0x(compoundV1Address)}`
            ]
          },
          {
            address: compoundV1Address,
            data: "0x" +
              `000000000000000000000000${rm0x(sender)}` +
              `000000000000000000000000${rm0x(testToken)}` +
              rm0x(quantityHex) +
              "0000000000000000000000000000000000000000000000000000000000000000" +
              rm0x(quantityHex),
            index: 11,
            topics: [
              "0x4ea5606ff36959d6c1a24f693661d800a98dd80c0fb8469a665d2ec7e8313c21"
            ]
          }
        ],
      }),
    ]);
    expect(txns.json.length).to.equal(0);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.tags).to.include("Compound");
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Deposit);
    expect(tx.description.toLowerCase()).to.include("deposit");
  });

  it("should handle withdrawals from compound v1", async () => {
    // Withdraw a la 0x1ebdcb2989fe980c40bbce3e68a9d74832ab67a4a0ded2be503ec61335e4bad6
    const chainData = getTestChainData([
      getTestEthTx({
        from: sender,
        to: compoundV1Address,
        logs: [
          {
            address: testToken,
            data: quantityHex,
            index: 12,
            topics: [
              "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
              `0x000000000000000000000000${rm0x(compoundV1Address)}`,
              `0x000000000000000000000000${rm0x(sender)}`,
            ]
          },
          {
            address: compoundV1Address,
            data: "0x" +
              `000000000000000000000000${rm0x(sender)}` +
              `000000000000000000000000${rm0x(testToken)}` +
              rm0x(quantityHex) +
              rm0x(quantityHex) +
              "0000000000000000000000000000000000000000000000000000000000000000",
            index: 134,
            topics: [
              "0x56559a17e3aa8ea4b05036eaf31aeaf9fb71fc1b8865b6389647639940bed030"
            ]
          }
        ],
      })
    ]);
    expect(txns.json.length).to.equal(0);
    txns.mergeChainData(chainData);
    expect(txns.json.length).to.equal(1);
    const tx = txns.json[0];
    expect(tx.tags).to.include("Compound");
    expect(tx.transfers.length).to.equal(2);
    expect(tx.transfers[1].category).to.equal(TransferCategories.Withdraw);
    expect(tx.description.toLowerCase()).to.include("withdraw");
  });

  // it("should handle deposits to compound v2", async () => {});
  // it("should handle withdrawals from compound v2", async () => {});

});

