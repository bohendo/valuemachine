import { getTransactions } from "@valuemachine/transactions";
import {
  Assets,
  EventTypes,
  Prices,
  Transaction,
  Transactions,
  TransactionSources,
  Transfer,
  TransferCategories,
} from "@valuemachine/types";
import {
  AddressOne,
  AddressThree,
  expect,
} from "@valuemachine/utils";

import { getPrices } from "./prices";
import { getValueMachine } from "./vm";
import { getTestAddressBook, testLogger } from "./testing";

const { ETH, UniV2_UNI_ETH, UNI, USD } = Assets;
const { Deposit, Expense, Income, SwapIn, SwapOut } = TransferCategories;
const { Coinbase, EthTx } = TransactionSources;
const log = testLogger.child({
  // level: "debug",
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

describe("VM", () => {
  let addressBook;
  let prices: Prices;
  let vm: any;
  let txns: Transactions;

  beforeEach(() => {
    addressBook = getTestAddressBook();
    txns = getTransactions({ addressBook, logger: log });
    expect(txns.json.length).to.equal(0);
    prices = getPrices({ logger: log });
    expect(Object.keys(prices.json).length).to.equal(0);
    vm = getValueMachine({ addressBook, prices, logger: log });
    expect(vm).to.be.ok;
  });

  it("should process several incomes and then a trade", async () => {
    const transactions = [
      getTx([
        // Income
        { asset: ETH, category: Income, from: notMe, quantity: "2.00", to: ethAccount },
      ]), getTx([
        // Income
        { asset: ETH, category: Income, from: notMe, quantity: "2.00", to: ethAccount },
      ]), getTx([
        // Income
        { asset: ETH, category: Income, from: notMe, quantity: "2.00", to: ethAccount },
      ]), getTx([
        // Income
        { asset: ETH, category: Income, from: notMe, quantity: "2.00", to: ethAccount },
      ]), getTx([
        // Trade ETH for UNI
        { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
        { asset: ETH, category: SwapOut, from: ethAccount, quantity: "3.0", to: notMe },
        { asset: UNI, category: SwapIn, from: notMe, quantity: "50.00", to: ethAccount },
      ]), getTx([
        // Trade UNI for ETH
        { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
        { asset: UNI, category: SwapOut, from: ethAccount, quantity: "50.00", to: notMe },
        { asset: ETH, category: SwapIn, from: notMe, quantity: "2.0", to: ethAccount },
      ]), getTx([
        // Send ETH to usdAccount
        { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
        { asset: ETH, category: Deposit, from: ethAccount, quantity: "3.0", to: usdAccount },
      ]),
    ];
    const start = Date.now();
    for (const transaction of transactions) {
      const newEvents = vm.execute(transaction);
      log.debug(vm.getNetWorth(), "new portfolio");
      log.debug(newEvents, "new events");
    }
    log.info(`Done processing ${transactions.length} transactions at a rate of ${
      Math.round(transactions.length * 10000/(Date.now() - start))/10
    } tx/s`);
  });

  it("should process internal transfers between jurisdictions", async () => {
    const transactions = [
      getTx([
        // Income
        { asset: ETH, category: Income, from: notMe, quantity: "10.00", to: ethAccount },
      ]), getTx([
        // Trade ETH for UNI
        { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
        { asset: ETH, category: SwapOut, from: ethAccount, quantity: "2.0", to: notMe },
        { asset: UNI, category: SwapIn, from: notMe, quantity: "50.00", to: ethAccount },
      ]), getTx([
        // Trade UNI for ETH
        { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
        { asset: UNI, category: SwapOut, from: ethAccount, quantity: "50.00", to: notMe },
        { asset: ETH, category: SwapIn, from: notMe, quantity: "2.5", to: ethAccount },
      ]), getTx([
        // Send ETH to usdAccount
        { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
        { asset: ETH, category: Deposit, from: ethAccount, quantity: "3.0", to: usdAccount },
      ]),
    ];
    const start = Date.now();
    for (const transaction of transactions) {
      const newEvents = vm.execute(transaction);
      log.debug(vm.getNetWorth(), "new portfolio");
      log.debug(newEvents, "new events");
    }
    log.info(`Done processing ${transactions.length} transactions at a rate of ${
      Math.round(transactions.length * 10000/(Date.now() - start))/10
    } tx/s`);
  });

  it("should process an investment into uniswap LP tokens", async () => {
    const transactions = [
      getTx([
        // Income
        { asset: ETH, category: Income, from: notMe, quantity: "10.00", to: ethAccount },
      ]), getTx([
        // Trade ETH for UNI
        { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
        { asset: ETH, category: SwapOut, from: ethAccount, quantity: "2.5", to: notMe },
        { asset: UNI, category: SwapIn, from: notMe, quantity: "50.00", to: ethAccount },
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
        { asset: ETH, category: Deposit, from: ethAccount, quantity: "3.0", to: usdAccount },
      ]),
    ];
    const start = Date.now();
    for (const transaction of transactions) {
      const newEvents = vm.execute(transaction);
      log.debug(vm.getNetWorth(), "new portfolio");
      log.debug(newEvents, "new events");
    }
    log.info(`Done processing ${transactions.length} transactions at a rate of ${
      Math.round(transactions.length * 10000/(Date.now() - start))/10
    } tx/s`);
  });

  it("should process newly purchased crypto", async () => {
    const transactions = [
      getTx([
        // Trade USD for ETH
        { asset: USD, category: Expense, from: usdAccount, quantity: "10", to: notMe },
        { asset: USD, category: SwapOut, from: usdAccount, quantity: "100", to: notMe },
        { asset: ETH, category: SwapIn, from: notMe, quantity: "1.0", to: usdAccount },
      ]), getTx([
        // Trade more USD for ETH
        { asset: USD, category: Expense, from: usdAccount, quantity: "10", to: notMe },
        { asset: USD, category: SwapOut, from: usdAccount, quantity: "100", to: notMe },
        { asset: ETH, category: SwapIn, from: notMe, quantity: "1.0", to: usdAccount },
      ]),
    ];
    const start = Date.now();
    for (const transaction of transactions) {
      const newEvents = vm.execute(transaction);
      log.debug(vm.getNetWorth(), "new portfolio");
      log.debug(newEvents, "new events");
    }
    log.info(`Done processing ${transactions.length} transactions at a rate of ${
      Math.round(transactions.length * 10000/(Date.now() - start))/10
    } tx/s`);
  });

  it("should process a partial swap", async () => {
    const transactions = [
      getTx([
        // Income
        { asset: ETH, category: Income, from: notMe, quantity: "10.00", to: ethAccount },
      ]), getTx([
        // Partial swap
        { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
        { asset: ETH, category: SwapOut, from: ethAccount, quantity: "5.00", to: notMe },
      ]),
    ];
    const start = Date.now();
    for (const transaction of transactions) {
      const newEvents = vm.execute(transaction);
      log.debug(vm.getNetWorth(), "new portfolio");
      log.debug(newEvents, "new events");
    }
    log.info(`Done processing ${transactions.length} transactions at a rate of ${
      Math.round(transactions.length * 10000/(Date.now() - start))/10
    } tx/s`);
    log.info(vm.getJson().events, `All events`);
    expect(vm.getJson().events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.getJson().events[1]?.type).to.equal(EventTypes.Expense);
    expect(vm.getJson().events[2]?.type).to.equal(EventTypes.Expense);
    expect(vm.getJson().events[2]?.newBalances?.[ETH]).to.equal("4.9");
  });

  it("should process out of order eth transfers", async () => {
    const transactions = [
      getTx([
        // Income
        { asset: ETH, category: Income, from: notMe, quantity: "1.00", to: ethAccount },
      ]), getTx([
        // spend too much then get sufficient income
        { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH },
        { asset: ETH, category: Expense, from: ethAccount, quantity: "2.00", to: notMe },
        { asset: ETH, category: Income, from: notMe, quantity: "2.00", to: ethAccount },
      ]),
    ];
    const start = Date.now();
    for (const transaction of transactions) {
      const newEvents = vm.execute(transaction);
      log.debug(vm.getNetWorth(), "new portfolio");
      log.debug(newEvents, "new events");
    }
    log.info(`Done processing ${transactions.length} transactions at a rate of ${
      Math.round(transactions.length * 10000/(Date.now() - start))/10
    } tx/s`);
    const events = vm.getJson().events;
    log.info(events, `All events`);
    expect(events[events.length - 1]?.newBalances?.[ETH]).to.equal("0.9");
  });

  it("should process out of order eth swaps", async () => {
    const transactions = [
      getTx([
        // Income
        { asset: ETH, category: Income, from: notMe, quantity: "1.00", to: ethAccount },
      ]), getTx([
        // spend too much then get sufficient income
        { asset: ETH, category: Expense, from: ethAccount, quantity: "0.1", to: ETH, index: 0 },
        { asset: ETH, category: SwapOut, from: ethAccount, quantity: "2.20", to: notMe, index: 1 },
        { asset: UNI, category: SwapIn, from: notMe, quantity: "100", to: ethAccount, index: 2 },
        { asset: ETH, category: SwapIn, from: notMe, quantity: "2.0", to: ethAccount, index: 3 },
      ]),
    ];
    const start = Date.now();
    for (const transaction of transactions) {
      const newEvents = vm.execute(transaction);
      log.debug(vm.getNetWorth(), "new portfolio");
      log.debug(newEvents, "new events");
    }
    log.info(`Done processing ${transactions.length} transactions at a rate of ${
      Math.round(transactions.length * 10000/(Date.now() - start))/10
    } tx/s`);
    const events = vm.getJson().events;
    log.info(events, `All events`);
    expect(events[events.length - 1]?.newBalances?.[ETH]).to.equal("0.7");
  });

});
