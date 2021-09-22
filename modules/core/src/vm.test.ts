import {
  Assets,
  EvmApps,
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
  add,
  sub,
} from "@valuemachine/utils";

import { getPrices } from "./prices";
import { getValueMachine } from "./vm";
import {
  AddressOne,
  AddressTwo,
  AddressThree,
  expect,
  getTestAddressBook,
  testLogger,
} from "./testUtils";

const { ETH, DAI, UniV2_UNI_ETH, UNI, USD } = Assets;
const {
  Borrow,
  Expense,
  Fee,
  Income,
  Internal,
  Refund,
  Repay,
  SwapIn,
  SwapOut,
} = TransferCategories;
const { Coinbase } = TransactionSources;
const { Ethereum, USA } = Guards;
const log = testLogger.child({ module: "TestVM" }, { level: "silent" });

const ethAccount = `${Ethereum}/${AddressOne}`;
const otherAccount = `${Ethereum}/${AddressTwo}`;
const aaveAccount = `${Ethereum}/${EvmApps.Aave}/${AddressOne}`;
const notMe = `${Ethereum}/${AddressThree}`;
const usdAccount = `${USA}/${Coinbase}/account`;

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

  it("should emit events w in/outputs that add up to the transferred amounts", async () => {
    const income1 = "1.0";
    const income2 = "0.5";
    const expense1 = "0.1";
    const expense2 = "1.0";
    [getTestTx([ // Income
      { asset: ETH, category: Income, from: notMe, amount: income1, to: ethAccount },
    ]), getTestTx([ // more income + expenses
      { asset: ETH, category: Fee, from: ethAccount, amount: expense1, to: notMe },
      { asset: ETH, category: Income, from: notMe, amount: income2, to: ethAccount },
      { asset: ETH, category: Expense, from: ethAccount, amount: expense2, to: notMe },
    ])].forEach(vm.execute);
    expect(vm.getNetWorth()).to.deep.equal({
      [ETH]: sub(add(income1, income2), add(expense1, expense2)),
    });
    expect(vm.json.events.length).to.equal(3);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Expense);
    // Input & output chunks should add up to the transferred amount
    expect(vm.json.events[0]?.inputs?.reduce((total, chunkIndex) => {
      return add(total, vm.getChunk(chunkIndex).amount);
    }, "0")).to.equal(income1);
    expect(vm.json.events[1]?.inputs?.reduce((total, chunkIndex) => {
      return add(total, vm.getChunk(chunkIndex).amount);
    }, "0")).to.equal(income2);
    expect(vm.json.events[2]?.outputs?.reduce((total, chunkIndex) => {
      return add(total, vm.getChunk(chunkIndex).amount);
    }, "0")).to.equal(expense2);
  });

  it("should process out of order eth transfers gracefully", async () => {
    [getTestTx([ // Income
      { asset: ETH, category: Income, from: notMe, amount: "1.0", to: ethAccount },
    ]), getTestTx([ // spend too much then get sufficient income w/in the same tx
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: ETH, category: Expense, from: ethAccount, amount: "1.0", to: notMe },
      { asset: ETH, category: Expense, from: otherAccount, amount: "1.0", to: notMe },
      { asset: ETH, category: Income, from: notMe, amount: "1.0", to: ethAccount },
      { asset: ETH, category: Income, from: notMe, amount: "2.0", to: otherAccount },
    ])].forEach(vm.execute);
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "1.9" });
    expect(vm.getNetWorth(ethAccount)).to.deep.equal({ [ETH]: "0.9" });
    expect(vm.getNetWorth(otherAccount)).to.deep.equal({ [ETH]: "1.0" });
    expect(vm.json.events.length).to.equal(5);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Expense);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Expense);
    expect(vm.json.events[3]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[4]?.type).to.equal(EventTypes.Income);
  });

  it("should emit an error event during unexpected underflows", async () => {
    [getTestTx([ // Income
      { asset: ETH, category: Income, from: notMe, amount: "1.0", to: ethAccount },
    ]), getTestTx([ // spend more than we're holding
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: ETH, category: Expense, from: ethAccount, amount: "1.0", to: notMe },
    ])].forEach(vm.execute);
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "-0.1" });
    expect(vm.json.events.length).to.equal(4);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Expense);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Debt);
    expect(vm.json.events[3]?.type).to.equal(EventTypes.Error);
  });

  it("should emit an error event if swap accounts don't match", async () => {
    [getTestTx([ // Income
      { asset: ETH, category: Income, from: notMe, amount: "2.0", to: ethAccount },
    ]), getTestTx([ // swap out from one account & swap into a different account
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: ETH, category: SwapOut, from: ethAccount, amount: "1.0", to: notMe },
      { asset: UNI, category: SwapIn, from: notMe, amount: "50.0", to: otherAccount },
    ])].forEach(vm.execute);
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "0.9", [UNI]: "50.0" });
    expect(vm.json.events.length).to.equal(3);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Trade);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Error);
  });

  it("should process borrowing & repaying a loan", async () => {
    [getTestTx([
      { asset: ETH, category: Income, from: notMe, amount: "10.0", to: ethAccount },
    ]), getTestTx([
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: ETH, category: Internal, from: ethAccount, amount: "2.0", to: aaveAccount },
    ]), getTestTx([
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: DAI, category: Borrow, from: aaveAccount, amount: "200", to: ethAccount },
    ])].forEach(vm.execute);
    // Check balances while loan is outstanding
    expect(vm.getNetWorth(aaveAccount)).to.deep.equal({ [ETH]: "2.0", [DAI]: "-200.0" });
    expect(vm.getNetWorth(ethAccount)).to.deep.equal({ [ETH]: "7.8", [DAI]: "200.0" });
    [getTestTx([
      { asset: DAI, category: Income, from: notMe, amount: "10.0", to: aaveAccount },
    ]), getTestTx([
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: DAI, category: Repay, from: ethAccount, amount: "200", to: aaveAccount },
      { asset: DAI, category: Fee, from: aaveAccount, amount: "10", to: notMe },
    ])].forEach(vm.execute);
    expect(vm.getNetWorth(aaveAccount)).to.deep.equal({ [ETH]: "2.0" });
    expect(vm.getNetWorth(ethAccount)).to.deep.equal({ [ETH]: "7.7" });
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "9.7" });
    expect(vm.json.events.length).to.equal(4);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Debt);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[3]?.type).to.equal(EventTypes.Debt);
  });

  it("should process a trade that includes a refund", async () => {
    const amount = "2.0";
    const refund = "0.2";
    const asset = ETH;
    [getTestTx([
      { asset: ETH, category: Income, from: notMe, amount: "10.0", to: ethAccount },
    ]), getTestTx([
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: asset, category: SwapOut, from: ethAccount, amount: amount, to: notMe },
      { asset: UNI, category: SwapIn, from: notMe, amount: "200.0", to: ethAccount },
      { asset: asset, category: Refund, from: notMe, amount: refund, to: ethAccount },
    ])].forEach(vm.execute);
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "8.1", [UNI]: "200.0" });
    expect(vm.json.events.length).to.equal(2);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Trade);
    expect(vm.json.chunks.find(chunk =>
      chunk.asset === asset && chunk.amount === sub(amount, refund)
    )).to.not.be.undefined;
  });

  it("should process multiple incomes and trades before chainging guards", async () => {
    [getTestTx([ // Income
      { asset: ETH, category: Income, from: notMe, amount: "2.0", to: ethAccount },
    ]), getTestTx([ // Income
      { asset: ETH, category: Income, from: notMe, amount: "2.0", to: ethAccount },
    ]), getTestTx([ // Trade ETH for UNI
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: ETH, category: SwapOut, from: ethAccount, amount: "3.0", to: notMe },
      { asset: UNI, category: SwapIn, from: notMe, amount: "200.0", to: ethAccount },
    ]), getTestTx([ // Trade UNI for ETH
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: UNI, category: SwapOut, from: ethAccount, amount: "200.0", to: notMe },
      { asset: ETH, category: SwapIn, from: notMe, amount: "4.0", to: ethAccount },
    ]), getTestTx([ // Send ETH to usdAccount
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: ETH, category: Internal, from: ethAccount, amount: "3.0", to: usdAccount },
    ])].forEach(vm.execute);
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "4.7" });
    expect(vm.json.events.length).to.equal(5);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Trade);
    expect(vm.json.events[3]?.type).to.equal(EventTypes.Trade);
    expect(vm.json.events[4]?.type).to.equal(EventTypes.GuardChange);
  });

  it("should process internal transfers between guards", async () => {
    [getTestTx([ // Income
      { asset: ETH, category: Income, from: notMe, amount: "10.0", to: ethAccount },
    ]), getTestTx([ // Trade ETH for UNI
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: ETH, category: SwapOut, from: ethAccount, amount: "2.0", to: notMe },
      { asset: UNI, category: SwapIn, from: notMe, amount: "50.0", to: ethAccount },
    ]), getTestTx([ // Trade UNI for ETH
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: UNI, category: SwapOut, from: ethAccount, amount: "50.0", to: notMe },
      { asset: ETH, category: SwapIn, from: notMe, amount: "2.5", to: ethAccount },
    ]), getTestTx([ // Send ETH to usdAccount
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: ETH, category: Internal, from: ethAccount, amount: "3.0", to: usdAccount },
    ])].forEach(vm.execute);
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "10.2" });
    expect(vm.json.events.length).to.equal(4);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Trade);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Trade);
    expect(vm.json.events[3]?.type).to.equal(EventTypes.GuardChange);
  });

  it("should process an investment into uniswap LP tokens", async () => {
    [getTestTx([ // Income
      { asset: ETH, category: Income, from: notMe, amount: "10.0", to: ethAccount },
    ]), getTestTx([ // Trade ETH for UNI
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: ETH, category: SwapOut, from: ethAccount, amount: "2.5", to: notMe },
      { asset: UNI, category: SwapIn, from: notMe, amount: "50.0", to: ethAccount },
    ]), getTestTx([ // Trade UNI + ETH for LP
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: ETH, category: SwapOut, from: ethAccount, amount: "2.50", to: notMe },
      { asset: UNI, category: SwapOut, from: ethAccount, amount: "50.0", to: notMe },
      { asset: UniV2_UNI_ETH, category: SwapIn, from: notMe, amount: "0.01", to: ethAccount },
    ]), getTestTx([ // Trade LP for UNI + ETH
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: UniV2_UNI_ETH, category: SwapOut, from: ethAccount, amount: "0.01", to: notMe },
      { asset: ETH, category: SwapIn, from: notMe, amount: "3.0", to: ethAccount },
      { asset: UNI, category: SwapIn, from: notMe, amount: "75.0", to: ethAccount },
    ]), getTestTx([ // Trade UNI for ETH
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: UNI, category: SwapOut, from: ethAccount, amount: "75.0", to: notMe },
      { asset: ETH, category: SwapIn, from: notMe, amount: "2.0", to: ethAccount },
    ]), getTestTx([ // Send ETH to usdAccount
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: ETH, category: Internal, from: ethAccount, amount: "3.0", to: usdAccount },
    ])].forEach(vm.execute);
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "9.5" });
    expect(vm.json.events.length).to.equal(6);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Trade);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Trade);
    expect(vm.json.events[3]?.type).to.equal(EventTypes.Trade);
    expect(vm.json.events[4]?.type).to.equal(EventTypes.Trade);
    expect(vm.json.events[5]?.type).to.equal(EventTypes.GuardChange);
  });

  it("should process newly purchased crypto gracefully", async () => {
    [getTestTx([ // Trade USD for ETH
      { asset: USD, category: Fee, from: usdAccount, amount: "10", to: notMe },
      { asset: USD, category: SwapOut, from: usdAccount, amount: "100", to: notMe },
      { asset: ETH, category: SwapIn, from: notMe, amount: "1.0", to: usdAccount },
    ]), getTestTx([ // Trade more USD for ETH
      { asset: USD, category: Fee, from: usdAccount, amount: "10", to: notMe },
      { asset: USD, category: SwapOut, from: usdAccount, amount: "100", to: notMe },
      { asset: ETH, category: SwapIn, from: notMe, amount: "1.0", to: usdAccount },
    ])].forEach(vm.execute);
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "2.0", [USD]: "-220.0" });
    expect(vm.json.events.length).to.equal(6);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Trade);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Debt);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Error);
    expect(vm.json.events[3]?.type).to.equal(EventTypes.Trade);
    expect(vm.json.events[4]?.type).to.equal(EventTypes.Debt);
    expect(vm.json.events[5]?.type).to.equal(EventTypes.Error);
  });

  it("should emit an event when guards change", async () => {
    [getTestTx([
      { asset: ETH, category: Income, from: notMe, amount: "10.0", to: ethAccount },
    ]), getTestTx([
      { asset: ETH, category: Internal, from: ethAccount, amount: "5.0", to: usdAccount },
    ]), getTestTx([
      { asset: ETH, category: Internal, from: usdAccount, amount: "5.0", to: ethAccount },
    ])].forEach(vm.execute);
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "10.0" });
    expect(vm.json.events.length).to.equal(3);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.GuardChange);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.GuardChange);
  });

  it("should process a lone SwapIn as income", async () => {
    [getTestTx([ // Income
      { asset: ETH, category: Income, from: notMe, amount: "10.0", to: ethAccount },
    ]), getTestTx([ // Partial swap
      { asset: ETH, category: Fee, from: ethAccount, amount: "0.1", to: Ethereum },
      { asset: ETH, category: SwapOut, from: ethAccount, amount: "5.0", to: notMe },
    ])].forEach(vm.execute);
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "4.9" });
    expect(vm.json.events.length).to.equal(3);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Error);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Expense);
  });

});
