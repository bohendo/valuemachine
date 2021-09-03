import {
  Assets,
  getTestTx,
  Guards,
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
  testLogger,
} from "./testUtils";

const { ETH, UniV2_UNI_ETH, UNI, USD } = Assets;
const { Internal, Fee, Refund, Expense, Income, SwapIn, SwapOut } = TransferCategories;
const { Coinbase } = TransactionSources;
const { Ethereum } = Guards;
const log = testLogger.child({ module: "TestVM" }, {
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

  it("should process a trade that includes a refund", async () => {
    [getTestTx([
      { asset: ETH, category: Income, from: notMe, quantity: "10.00", to: ethAccount },
    ]), getTestTx([
      { asset: ETH, category: Fee, from: ethAccount, quantity: "0.01", to: Ethereum },
      { asset: ETH, category: SwapOut, from: ethAccount, quantity: "2.00", to: notMe },
      { asset: UNI, category: SwapIn, from: notMe, quantity: "200", to: ethAccount },
      { asset: ETH, category: Refund, from: notMe, quantity: "0.02", to: ethAccount },
    ])].forEach(tx => {
      const newEvents = vm.execute(tx);
      log.debug(newEvents, "new events");
    });
    // log.debug(vm.json.chunks, "resulting chunks");
    expect(vm.json.events.length).to.equal(2);
    expect(vm.json.chunks.length).to.equal(4);
    expect(vm.json.chunks[2].quantity).to.equal("1.98");
  });

  it("should process a guard change", async () => {
    [getTestTx([
      { asset: ETH, category: Income, from: notMe, quantity: "10.00", to: ethAccount },
    ]), getTestTx([
      { asset: ETH, category: Internal, from: ethAccount, quantity: "5.00", to: usdAccount },
    ]), getTestTx([
      { asset: ETH, category: Internal, from: usdAccount, quantity: "5.00", to: ethAccount },
    ])].forEach(tx => {
      const newEvents = vm.execute(tx);
      log.debug(newEvents, "new events");
    });
    expect(vm.json.events.length).to.equal(3);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.GuardChange);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.GuardChange);
  });

  it("should process several incomes and then a trade", async () => {
    [getTestTx([
      // Income
      { asset: ETH, category: Income, from: notMe, quantity: "2.00", to: ethAccount },
    ]), getTestTx([
      // Income
      { asset: ETH, category: Income, from: notMe, quantity: "2.00", to: ethAccount },
    ]), getTestTx([
      // Income
      { asset: ETH, category: Income, from: notMe, quantity: "2.00", to: ethAccount },
    ]), getTestTx([
      // Income
      { asset: ETH, category: Income, from: notMe, quantity: "2.00", to: ethAccount },
    ]), getTestTx([
      // Trade ETH for UNI
      { asset: ETH, category: Fee, from: ethAccount, quantity: "0.1", to: Ethereum },
      { asset: ETH, category: SwapOut, from: ethAccount, quantity: "3.0", to: notMe },
      { asset: UNI, category: SwapIn, from: notMe, quantity: "50.00", to: ethAccount },
    ]), getTestTx([
      // Trade UNI for ETH
      { asset: ETH, category: Fee, from: ethAccount, quantity: "0.1", to: Ethereum },
      { asset: UNI, category: SwapOut, from: ethAccount, quantity: "50.00", to: notMe },
      { asset: ETH, category: SwapIn, from: notMe, quantity: "2.0", to: ethAccount },
    ]), getTestTx([
      // Send ETH to usdAccount
      { asset: ETH, category: Fee, from: ethAccount, quantity: "0.1", to: Ethereum },
      { asset: ETH, category: Internal, from: ethAccount, quantity: "3.0", to: usdAccount },
    ])].forEach(tx => {
      const newEvents = vm.execute(tx);
      log.debug(newEvents, "new events");
    });
    expect(vm.json.events.length).to.equal(7);
  });

  it("should process internal transfers between guards", async () => {
    [getTestTx([
      // Income
      { asset: ETH, category: Income, from: notMe, quantity: "10.00", to: ethAccount },
    ]), getTestTx([
      // Trade ETH for UNI
      { asset: ETH, category: Fee, from: ethAccount, quantity: "0.1", to: Ethereum },
      { asset: ETH, category: SwapOut, from: ethAccount, quantity: "2.0", to: notMe },
      { asset: UNI, category: SwapIn, from: notMe, quantity: "50.00", to: ethAccount },
    ]), getTestTx([
      // Trade UNI for ETH
      { asset: ETH, category: Fee, from: ethAccount, quantity: "0.1", to: Ethereum },
      { asset: UNI, category: SwapOut, from: ethAccount, quantity: "50.00", to: notMe },
      { asset: ETH, category: SwapIn, from: notMe, quantity: "2.5", to: ethAccount },
    ]), getTestTx([
      // Send ETH to usdAccount
      { asset: ETH, category: Fee, from: ethAccount, quantity: "0.1", to: Ethereum },
      { asset: ETH, category: Internal, from: ethAccount, quantity: "3.0", to: usdAccount },
    ])].forEach(tx => {
      const newEvents = vm.execute(tx);
      log.debug(newEvents, "new events");
    });
    expect(vm.json.events.length).to.equal(4);
  });

  it("should process an investment into uniswap LP tokens", async () => {
    [getTestTx([
      // Income
      { asset: ETH, category: Income, from: notMe, quantity: "10.00", to: ethAccount },
    ]), getTestTx([
      // Trade ETH for UNI
      { asset: ETH, category: Fee, from: ethAccount, quantity: "0.1", to: Ethereum },
      { asset: ETH, category: SwapOut, from: ethAccount, quantity: "2.5", to: notMe },
      { asset: UNI, category: SwapIn, from: notMe, quantity: "50.00", to: ethAccount },
    ]), getTestTx([
      // Trade UNI + ETH for LP
      { asset: ETH, category: Fee, from: ethAccount, quantity: "0.1", to: Ethereum },
      { asset: ETH, category: SwapOut, from: ethAccount, quantity: "2.50", to: notMe },
      { asset: UNI, category: SwapOut, from: ethAccount, quantity: "50.00", to: notMe },
      { asset: UniV2_UNI_ETH, category: SwapIn, from: notMe, quantity: "0.01", to: ethAccount },
    ]), getTestTx([
      // Trade LP for UNI + ETH
      { asset: ETH, category: Fee, from: ethAccount, quantity: "0.1", to: Ethereum },
      { asset: UniV2_UNI_ETH, category: SwapOut, from: ethAccount, quantity: "0.01", to: notMe },
      { asset: ETH, category: SwapIn, from: notMe, quantity: "3.00", to: ethAccount },
      { asset: UNI, category: SwapIn, from: notMe, quantity: "75.00", to: ethAccount },
    ]), getTestTx([
      // Trade UNI for ETH
      { asset: ETH, category: Fee, from: ethAccount, quantity: "0.1", to: Ethereum },
      { asset: UNI, category: SwapOut, from: ethAccount, quantity: "75.00", to: notMe },
      { asset: ETH, category: SwapIn, from: notMe, quantity: "2.0", to: ethAccount },
    ]), getTestTx([
      // Send ETH to usdAccount
      { asset: ETH, category: Fee, from: ethAccount, quantity: "0.1", to: Ethereum },
      { asset: ETH, category: Internal, from: ethAccount, quantity: "3.0", to: usdAccount },
    ])].forEach(tx => {
      const newEvents = vm.execute(tx);
      log.debug(newEvents, "new events");
    });
    expect(vm.json.events.length).to.equal(6);
  });

  it("should process newly purchased crypto", async () => {
    [getTestTx([
      // Trade USD for ETH
      { asset: USD, category: Fee, from: usdAccount, quantity: "10", to: notMe },
      { asset: USD, category: SwapOut, from: usdAccount, quantity: "100", to: notMe },
      { asset: ETH, category: SwapIn, from: notMe, quantity: "1.0", to: usdAccount },
    ]), getTestTx([
      // Trade more USD for ETH
      { asset: USD, category: Fee, from: usdAccount, quantity: "10", to: notMe },
      { asset: USD, category: SwapOut, from: usdAccount, quantity: "100", to: notMe },
      { asset: ETH, category: SwapIn, from: notMe, quantity: "1.0", to: usdAccount },
    ])].forEach(tx => {
      const newEvents = vm.execute(tx);
      log.debug(newEvents, "new events");
    });
    expect(vm.json.events.length).to.equal(2);
  });

  it("should process a partial swap", async () => {
    [getTestTx([
      // Income
      { asset: ETH, category: Income, from: notMe, quantity: "10.00", to: ethAccount },
    ]), getTestTx([
      // Partial swap
      { asset: ETH, category: Fee, from: ethAccount, quantity: "0.1", to: Ethereum },
      { asset: ETH, category: SwapOut, from: ethAccount, quantity: "5.00", to: notMe },
    ])].forEach(tx => {
      const newEvents = vm.execute(tx);
      log.debug(newEvents, "new events");
    });
    expect(vm.json.events.length).to.equal(2);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Expense);
  });

  it("should process out of order eth transfers", async () => {
    [getTestTx([
      // Income
      { asset: ETH, category: Income, from: notMe, quantity: "1.00", to: ethAccount },
    ]), getTestTx([
      // spend too much then get sufficient income
      { asset: ETH, category: Fee, from: ethAccount, quantity: "0.1", to: Ethereum },
      { asset: ETH, category: Expense, from: ethAccount, quantity: "2.00", to: notMe },
      { asset: ETH, category: Income, from: notMe, quantity: "2.00", to: ethAccount },
    ])].forEach(tx => {
      const newEvents = vm.execute(tx);
      log.debug(newEvents, "new events");
    });
    expect(vm.json.events.length).to.equal(3);
  });

});
