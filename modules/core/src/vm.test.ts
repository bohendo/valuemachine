import {
  Assets,
  TransactionSources,
} from "@valuemachine/transactions";
import {
  EventTypes,
  Prices,
  TransferCategories,
} from "@valuemachine/types";
import {
} from "@valuemachine/utils";

import { getPrices } from "./prices";
import { getValueMachine } from "./vm";
import {
  AddressOne,
  AddressThree,
  expect,
  getTestAddressBook,
  getTx,
  testLogger,
} from "./testUtils";

const { ETH, UniV2_UNI_ETH, UNI, USD } = Assets;
const { Deposit, Withdraw, Expense, Income, SwapIn, SwapOut } = TransferCategories;
const { Coinbase } = TransactionSources;
const log = testLogger.child({ module: "TestVM",
  // level: "debug",
});

const ethAccount = AddressOne;
const notMe = AddressThree;
const usdAccount = `${Coinbase}-account`;

describe("VM", () => {
  let addressBook;
  let prices: Prices;
  let vm: any;

  beforeEach(() => {
    addressBook = getTestAddressBook();
    prices = getPrices({ logger: log });
    expect(Object.keys(prices.json).length).to.equal(0);
    vm = getValueMachine({ addressBook, logger: log });
    expect(vm).to.be.ok;
  });

  it("should process a guard change", async () => {
    const transactions = [
      getTx([
        { asset: ETH, category: Income, from: notMe, quantity: "10.00", to: ethAccount },
      ]), getTx([
        { asset: ETH, category: Deposit, from: ethAccount, quantity: "5.00", to: usdAccount },
      ]), getTx([
        { asset: ETH, category: Withdraw, from: usdAccount, quantity: "5.00", to: ethAccount },
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
    log.info(vm.json.events, `All events`);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.GuardChange);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.GuardChange);
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

  it("should process internal transfers between guards", async () => {
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
    log.info(vm.json.events, `All events`);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Expense);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Expense);
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
    const events = vm.json.events;
    log.info(events, `All events`);
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
    const events = vm.json.events;
    log.info(events, `All events`);
  });

});
