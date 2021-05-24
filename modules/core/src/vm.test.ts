import { AddressZero, HashZero } from "@ethersproject/constants";
import {
  Prices,
  ChainData,
  State,
  Transactions,
} from "@finances/types";
import { expect } from "@finances/utils";

import { getPrices } from "./prices";
import { getState } from "./state";
import { getValueMachine } from "./vm";
import { AddressOne, getTestAddressBook, getTestChainData, testLogger } from "./testing";
import { getTransactions } from "./transactions";

const log = testLogger.child({ module: "TestVM" });
const timestamp = "2018-01-02T01:00:00Z";
const value = "1.3141592653589793";

describe("VM", () => {
  let addressBook;
  let prices: Prices;
  let chainData: ChainData;
  let state: State;
  let vm: any;
  let txns: Transactions;
  const asset = "ETH";

  beforeEach(() => {
    addressBook = getTestAddressBook();
    chainData = getTestChainData([{
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
      timestamp,
      to: AddressOne,
      value,
    }]);
    txns = getTransactions({ addressBook, logger: log });
    expect(txns.json.length).to.equal(0);
    prices = getPrices({ logger: log });
    expect(Object.keys(prices.json).length).to.equal(0);
    state = getState({ addressBook, prices, logger: log });
    expect(Object.keys(state.getAllBalances()).length).to.equal(0);
    vm = getValueMachine({ addressBook, prices, logger: log });
    expect(vm).to.be.ok;
  });

  it("should process a transaction", async () => {
    txns.mergeChainData(chainData);
    const [newState, events] = vm(state.toJson(), txns.json[0]);
    expect(newState).to.be.ok;
    expect(events.length).to.equal(1);
    expect(getState({
      addressBook,
      stateJson: newState
    }).getBalance(AddressOne, asset)).to.equal(value);
  });

});


