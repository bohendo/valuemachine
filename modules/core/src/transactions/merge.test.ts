import { ChainData, EthTransaction, Transactions } from "@finances/types";
import { expect, getLogger } from "@finances/utils";
import { AddressZero, HashZero } from "@ethersproject/constants";

import { getAddressBook } from "../addressBook";
import { getChainData } from "../chainData";

import { getTransactions } from "./index";

const log = getLogger("info").child({ module: "TestTransactions" });

// Util for processing a single eth tx
const getFakeChainData = (tx: EthTransaction): ChainData => getChainData({
  logger: log,
  chainDataJson: {
    addresses: {
      [AddressZero]: {
        history: [HashZero]
      }
    },
    calls: [],
    tokens: {},
    transactions: [
      {
        block: 10,
        data: "0x",
        from: AddressZero,
        gasLimit: "0x100000",
        gasPrice: "0x100000",
        gasUsed: "0x1000",
        hash: HashZero,
        index: 1,
        logs: [],
        nonce: 0,
        status: 1,
        timestamp: "2000-01-01T00:00:00.000Z",
        to: AddressZero,
        value: "0.0",
        ...tx,
      },
    ],
  },
});

describe("transactions merge", () => {
  const addressBook = getAddressBook(
    [{ name: "test", category: "self", address: AddressZero }],
    log
  );
  let txns: Transactions;

  beforeEach(() => {
    txns = getTransactions({ addressBook, logger: log });
  });

  it("should run without error", async () => {
    expect(txns.mergeChainData(getFakeChainData())).to.not.throw;
  });

});
