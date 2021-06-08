import {
  Assets,
  TransactionSources,
  TransferCategories,
  Prices,
  Transfer,
  State,
  Transaction,
  Transactions,
} from "@finances/types";
import { expect } from "@finances/utils";

import { getPrices } from "./prices";
import { getState } from "./state";
import { getValueMachine } from "./vm";
import { AddressOne, AddressThree, getTestAddressBook, testLogger } from "./testing";
import { getTransactions } from "./transactions";

const { UNI, ETH, UniV2_UNI_ETH } = Assets;
const { Deposit, Expense, Income, SwapIn, SwapOut } = TransferCategories;
const { Coinbase, EthTx } = TransactionSources;
const log = testLogger.child({
  level: "debug",
  module: "TestVM",
});

const ethAccount = AddressOne;
const notMe = AddressThree;
const usdAccount = `${Coinbase}-account`;

const timestamp = "2018-01-01T01:00:00Z";
let txIndex = 0;
const getTx = (transfers: Transfer): Transaction => ({
  date: new Date(
    new Date(timestamp).getTime() + (txIndex * 24 * 60 * 60 * 1000)
  ).toISOString(),
  index: txIndex++,
  sources: [EthTx],
  tags: [],
  transfers: transfers || [],
  description: "test transaction",
});

describe.only("VM", () => {
  let addressBook;
  let prices: Prices;
  let state: State;
  let vm: any;
  let txns: Transactions;

  beforeEach(() => {
    addressBook = getTestAddressBook();
    txns = getTransactions({ addressBook, logger: log });
    expect(txns.json.length).to.equal(0);
    prices = getPrices({ logger: log });
    expect(Object.keys(prices.json).length).to.equal(0);
    state = getState({ addressBook, prices, logger: log });
    expect(Object.keys(state.getAllBalances()).length).to.equal(0);
    vm = getValueMachine({ addressBook, prices, logger: log });
    expect(vm).to.be.ok;
  });

  it("should process an investment into uniswap LP tokens", async () => {
    let newState, newEvents;
    const events = [];
    for (const transaction of [
      getTx([
        // Income
        { asset: ETH, category: Income, from: notMe, quantity: "10.00", to: ethAccount },
      ]), getTx([
        // Trade ETH for UNI
        { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
        { asset: ETH, category: SwapOut, from: ethAccount, quantity: "5.00", to: notMe },
        { asset: UNI, category: SwapIn, from: notMe, quantity: "100.00", to: ethAccount },
      ]), getTx([
        // Trade UNI + ETH for LP
        { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
        { asset: ETH, category: SwapOut, from: ethAccount, quantity: "2.50", to: notMe },
        { asset: UNI, category: SwapOut, from: ethAccount, quantity: "50.00", to: notMe },
        { asset: UniV2_UNI_ETH, category: SwapIn, from: notMe, quantity: "0.01", to: ethAccount },
      ]), getTx([
        // Trade LP for UNI + ETH
        { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
        { asset: UniV2_UNI_ETH, category: SwapOut, from: ethAccount, quantity: "0.01", to: notMe },
        { asset: ETH, category: SwapIn, from: notMe, quantity: "3.00", to: ethAccount },
        { asset: UNI, category: SwapIn, from: notMe, quantity: "75.00", to: ethAccount },
      ]), getTx([
        // Trade UNI for ETH
        { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
        { asset: UNI, category: SwapOut, from: ethAccount, quantity: "75.00", to: notMe },
        { asset: ETH, category: SwapIn, from: notMe, quantity: "2.0", to: ethAccount },
      ]), getTx([
        // Send ETH to usdAccount
        { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
        { asset: ETH, category: Deposit, from: ethAccount, quantity: "5.0", to: usdAccount },
      ]),
    ]) {
      [newState, newEvents] = vm(state.toJson(), transaction);
      events.push(...newEvents);
      log.debug(newState, "new state");
      log.debug(newEvents, "new events");
    }
  });

});


