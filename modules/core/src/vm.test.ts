import {
  Assets,
  EvmApps,
  getTestTx,
  Guards,
  Sources,
} from "@valuemachine/transactions";
import {
  EventTypes,
  TransferCategories,
} from "@valuemachine/types";
import {
  getValueMachineError,
  math,
} from "@valuemachine/utils";
import { expect } from "chai";

import { getValueMachine } from "./vm";
import {
  AddressOne,
  AddressTwo,
  AddressThree,
  getTestAddressBook,
  testLogger,
} from "./testUtils";

const { add, sub } = math;
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
const { Coinbase } = Sources;
const { Ethereum, USA } = Guards;
const log = testLogger.child({ module: "TestVM" }, { level: "silent" });

const addressBook = getTestAddressBook();
const ethAccount = `${Ethereum}/${AddressOne}`;
const otherAccount = `${Ethereum}/${AddressTwo}`;
const venueAccount = `${Ethereum}/${EvmApps.Aave}/${AddressOne}`;
const notMe = `${Ethereum}/${AddressThree}`;
const coinbase = `${USA}/${Coinbase}/account`;
const usdAccount = `${USA}/default`;

describe("VM", () => {
  let vm: any;
  beforeEach(() => {
    vm = getValueMachine({ addressBook, logger: log });
  });

  it("should handle an etherdelta-style fee", async () => {
    [getTestTx([ // Deposit
      { amount: "1", asset: ETH, category: Income, from: notMe, to: ethAccount },
      { amount: "1", asset: ETH, category: Internal, from: ethAccount, to: venueAccount },
    ]), getTestTx([ // Withdraw
      { amount: "0.9", asset: ETH, category: Internal, from: venueAccount, to: ethAccount },
      { amount: "ALL", asset: ETH, category: Fee, from: venueAccount, to: notMe },
    ])].forEach(vm.execute);
    expect(getValueMachineError(vm.json)).to.equal("");
    expect(vm.getNetWorth(venueAccount)).to.deep.equal({});
    expect(vm.getNetWorth(ethAccount)).to.deep.equal({ [ETH]: "0.9" });
    expect(vm.json.events.length).to.equal(1);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
  });

  it("should handle a transfer with amount=ALL", async () => {
    const amt1 = "2.1314";
    const amt2 = "1.0101";
    const total = add(amt1, amt2);
    [getTestTx([ // Income
      { amount: amt1, asset: ETH, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([ // Income
      { amount: amt2, asset: ETH, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([ // Internally transfer ALL
      { amount: "ALL", asset: ETH, category: Internal, from: ethAccount, to: venueAccount },
    ])].forEach(vm.execute);
    expect(getValueMachineError(vm.json)).to.equal("");
    expect(vm.getNetWorth(ethAccount)).to.deep.equal({});
    expect(vm.getNetWorth(venueAccount)).to.deep.equal({ [ETH]: total });
    [getTestTx([
      { amount: "ALL", asset: ETH, category: Expense, from: venueAccount, to: notMe },
    ])].forEach(vm.execute);
    expect(getValueMachineError(vm.json)).to.equal("");
    expect(vm.getNetWorth()).to.deep.equal({});
    expect(vm.json.events.length).to.equal(3);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Expense);
  });

  it("should handle nft transfers w/out an amount field", async () => {
    const nft = `${EvmApps.CryptoKitties}_12345`;
    [getTestTx([ // Income
      { asset: nft, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([ // Internal
      { asset: nft, category: Internal, from: ethAccount, to: venueAccount },
    ]), getTestTx([ // Expense
      { asset: nft, category: Expense, from: venueAccount, to: notMe },
    ])].forEach(vm.execute);
    expect(getValueMachineError(vm.json)).to.equal("");
    expect(vm.getNetWorth()).to.deep.equal({});
    expect(vm.json.events.length).to.equal(2);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Expense);
  });

  it("should emit events w in/outputs that add up to the transferred amounts", async () => {
    const income1 = "1.0";
    const income2 = "0.5";
    const expense1 = "0.1";
    const expense2 = "1.0";
    [getTestTx([ // Income
      { amount: income1, asset: ETH, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([ // more income + expenses
      { amount: expense1, asset: ETH, category: Fee, from: ethAccount, to: notMe },
      { amount: income2, asset: ETH, category: Income, from: notMe, to: ethAccount },
      { amount: expense2, asset: ETH, category: Expense, from: ethAccount, to: notMe },
    ])].forEach(vm.execute);
    expect(getValueMachineError(vm.json)).to.equal("");
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
      { amount: "1.0", asset: ETH, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([ // spend too much then get sufficient income from one income transfer
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "1.0", asset: ETH, category: Expense, from: ethAccount, to: notMe },
      { amount: "1.0", asset: ETH, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([ // spend too much then get sufficient income from two income transfers
      { amount: "1.0", asset: ETH, category: Expense, from: otherAccount, to: notMe },
      { amount: "0.75", asset: ETH, category: Income, from: notMe, to: otherAccount },
      { amount: "0.75", asset: ETH, category: Income, from: notMe, to: otherAccount },
    ])].forEach(vm.execute);
    // log.info(vm.json.chunks, `Final chunks:`);
    expect(getValueMachineError(vm.json)).to.equal("");
    expect(vm.getNetWorth(ethAccount)).to.deep.equal({ [ETH]: "0.9" });
    expect(vm.getNetWorth(otherAccount)).to.deep.equal({ [ETH]: "0.5" });
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "1.4" });
    expect(vm.json.events.length).to.equal(6);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Expense);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[3]?.type).to.equal(EventTypes.Expense);
    expect(vm.json.events[4]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[5]?.type).to.equal(EventTypes.Income);
  });

  it("should emit an error event during unexpected underflows", async () => {
    [getTestTx([ // Income
      { amount: "1.0", asset: ETH, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([ // spend more than we're holding
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "1.0", asset: ETH, category: Expense, from: ethAccount, to: notMe },
    ])].forEach(vm.execute);
    expect(getValueMachineError(vm.json)).to.equal("");
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "-0.1" });
    expect(vm.json.events.length).to.equal(4);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Expense);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Debt);
    expect(vm.json.events[3]?.type).to.equal(EventTypes.Error);
  });

  it("should emit an error event if swap accounts don't match", async () => {
    [getTestTx([ // Income
      { amount: "2.0", asset: ETH, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([ // swap out from one account & swap into a different account
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "1.0", asset: ETH, category: SwapOut, from: ethAccount, to: notMe },
      { amount: "50.0", asset: UNI, category: SwapIn, from: notMe, to: otherAccount },
    ])].forEach(vm.execute);
    expect(getValueMachineError(vm.json)).to.equal("");
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "0.9", [UNI]: "50.0" });
    expect(vm.json.events.length).to.equal(3);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Error);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Trade);
  });

  it("should process borrowing & repaying a loan", async () => {
    [getTestTx([
      { amount: "10.0", asset: ETH, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "2.0", asset: ETH, category: Internal, from: ethAccount, to: venueAccount },
    ]), getTestTx([
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "200", asset: DAI, category: Borrow, from: venueAccount, to: ethAccount },
    ])].forEach(vm.execute);
    expect(getValueMachineError(vm.json)).to.equal("");
    // Check balances while loan is outstanding
    expect(vm.getNetWorth(venueAccount)).to.deep.equal({ [ETH]: "2.0", [DAI]: "-200.0" });
    expect(vm.getNetWorth(ethAccount)).to.deep.equal({ [ETH]: "7.8", [DAI]: "200.0" });
    [getTestTx([
      { amount: "10.0", asset: DAI, category: Income, from: notMe, to: venueAccount },
    ]), getTestTx([
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "200", asset: DAI, category: Repay, from: ethAccount, to: venueAccount },
      { amount: "10", asset: DAI, category: Fee, from: venueAccount, to: notMe },
    ])].forEach(vm.execute);
    expect(getValueMachineError(vm.json)).to.equal("");
    expect(vm.getNetWorth(venueAccount)).to.deep.equal({ [ETH]: "2.0" });
    expect(vm.getNetWorth(ethAccount)).to.deep.equal({ [ETH]: "7.7" });
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "9.7" });
    expect(vm.json.events.length).to.equal(4);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Debt);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[3]?.type).to.equal(EventTypes.Debt);
  });

  it("should interpret extra repayment as a fee", async () => {
    [getTestTx([
      { amount: "10.0", asset: ETH, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "2.0", asset: ETH, category: Internal, from: ethAccount, to: venueAccount },
    ]), getTestTx([
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "200", asset: DAI, category: Borrow, from: venueAccount, to: ethAccount },
    ]), getTestTx([
      { amount: "10.0", asset: DAI, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "210", asset: DAI, category: Repay, from: ethAccount, to: venueAccount },
    ])].forEach(vm.execute);
    expect(getValueMachineError(vm.json)).to.equal("");
    expect(vm.getNetWorth(venueAccount)).to.deep.equal({ [ETH]: "2.0" });
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
      { amount: "10.0", asset: ETH, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: amount, asset: asset, category: SwapOut, from: ethAccount, to: notMe },
      { amount: "200.0", asset: UNI, category: SwapIn, from: notMe, to: ethAccount },
      { amount: refund, asset: asset, category: Refund, from: notMe, to: ethAccount },
    ])].forEach(vm.execute);
    expect(getValueMachineError(vm.json)).to.equal("");
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
      { amount: "2.0", asset: ETH, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([ // Income
      { amount: "2.0", asset: ETH, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([ // Trade ETH for UNI
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "3.0", asset: ETH, category: SwapOut, from: ethAccount, to: notMe },
      { amount: "200.0", asset: UNI, category: SwapIn, from: notMe, to: ethAccount },
    ]), getTestTx([ // Trade UNI for ETH
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "200.0", asset: UNI, category: SwapOut, from: ethAccount, to: notMe },
      { amount: "4.0", asset: ETH, category: SwapIn, from: notMe, to: ethAccount },
    ]), getTestTx([ // Send ETH to coinbase
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "3.0", asset: ETH, category: Internal, from: ethAccount, to: coinbase },
    ])].forEach(vm.execute);
    expect(getValueMachineError(vm.json)).to.equal("");
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
      { amount: "10.0", asset: ETH, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([ // Trade ETH for UNI
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "2.0", asset: ETH, category: SwapOut, from: ethAccount, to: notMe },
      { amount: "50.0", asset: UNI, category: SwapIn, from: notMe, to: ethAccount },
    ]), getTestTx([ // Trade UNI for ETH
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "50.0", asset: UNI, category: SwapOut, from: ethAccount, to: notMe },
      { amount: "2.5", asset: ETH, category: SwapIn, from: notMe, to: ethAccount },
    ]), getTestTx([ // Send ETH to coinbase
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "3.0", asset: ETH, category: Internal, from: ethAccount, to: coinbase },
    ])].forEach(vm.execute);
    expect(getValueMachineError(vm.json)).to.equal("");
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "10.2" });
    expect(vm.json.events.length).to.equal(4);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Trade);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Trade);
    expect(vm.json.events[3]?.type).to.equal(EventTypes.GuardChange);
  });

  it("should process an investment into uniswap LP tokens", async () => {
    [getTestTx([ // Income
      { amount: "10.0", asset: ETH, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([ // Trade ETH for UNI
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "2.5", asset: ETH, category: SwapOut, from: ethAccount, to: notMe },
      { amount: "50.0", asset: UNI, category: SwapIn, from: notMe, to: ethAccount },
    ]), getTestTx([ // Trade UNI + ETH for LP
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "2.50", asset: ETH, category: SwapOut, from: ethAccount, to: notMe },
      { amount: "50.0", asset: UNI, category: SwapOut, from: ethAccount, to: notMe },
      { amount: "0.01", asset: UniV2_UNI_ETH, category: SwapIn, from: notMe, to: ethAccount },
    ]), getTestTx([ // Trade LP for UNI + ETH
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "0.01", asset: UniV2_UNI_ETH, category: SwapOut, from: ethAccount, to: notMe },
      { amount: "3.0", asset: ETH, category: SwapIn, from: notMe, to: ethAccount },
      { amount: "75.0", asset: UNI, category: SwapIn, from: notMe, to: ethAccount },
    ]), getTestTx([ // Trade UNI for ETH
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "75.0", asset: UNI, category: SwapOut, from: ethAccount, to: notMe },
      { amount: "2.0", asset: ETH, category: SwapIn, from: notMe, to: ethAccount },
    ]), getTestTx([ // Send ETH to coinbase
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "3.0", asset: ETH, category: Internal, from: ethAccount, to: coinbase },
    ])].forEach(vm.execute);
    expect(getValueMachineError(vm.json)).to.equal("");
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
      { amount: "107.93", asset: USD, category: Internal, from: usdAccount, to: coinbase },
      { amount: "105.94", asset: USD, category: SwapOut, from: coinbase, to: notMe },
      { amount: "1.0", asset: ETH, category: SwapIn, from: notMe, to: coinbase },
      { amount: "1.99", asset: USD, category: Fee, from: coinbase, to: notMe },
    ])].forEach(vm.execute);
    // log.info(vm.json.chunks, "chunks");
    expect(getValueMachineError(vm.json)).to.equal("");
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "1.0", [USD]: "-107.93" });
    expect(vm.json.events.length).to.equal(3);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Trade);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Debt);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.Error);
  });

  it("should process lone swaps like expenses/income", async () => {
    [getTestTx([ // Income
      { amount: "10.0", asset: ETH, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([ // Partial swap
      { amount: "0.1", asset: ETH, category: Fee, from: ethAccount, to: Ethereum },
      { amount: "5.0", asset: ETH, category: SwapOut, from: ethAccount, to: notMe },
    ])].forEach(vm.execute);
    // log.info(vm.json.events, "events");
    expect(getValueMachineError(vm.json)).to.equal("");
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "4.9" });
    expect(vm.json.events.length).to.equal(2);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.Error);
  });

  it("should emit an event when guards change", async () => {
    [getTestTx([
      { amount: "10.0", asset: ETH, category: Income, from: notMe, to: ethAccount },
    ]), getTestTx([
      { amount: "5.0", asset: ETH, category: Internal, from: ethAccount, to: coinbase },
    ]), getTestTx([
      { amount: "5.0", asset: ETH, category: Internal, from: coinbase, to: ethAccount },
    ])].forEach(vm.execute);
    expect(getValueMachineError(vm.json)).to.equal("");
    expect(vm.getNetWorth()).to.deep.equal({ [ETH]: "10.0" });
    expect(vm.json.events.length).to.equal(3);
    expect(vm.json.events[0]?.type).to.equal(EventTypes.Income);
    expect(vm.json.events[1]?.type).to.equal(EventTypes.GuardChange);
    expect(vm.json.events[2]?.type).to.equal(EventTypes.GuardChange);
  });

  it.skip("should process lots of txns with acceptable performance", async () => {
    vm = getValueMachine({ addressBook, logger: log.child({}, { level: "error" }) });
    const n = 1000;
    const epoch = 500;
    const begin = Date.now();
    let start = begin;
    const getRate = (index) => {
      const rate = epoch * 1000 / (Date.now() - start);
      log.info(`Processed txns ${index-epoch}-${index} at a rate of ${rate} tx/s`);
      start = Date.now();
      return rate;
    };
    Array(n).fill().forEach((e, i) => {
      if (i > 0 && i !== n && i % epoch === 0) getRate(i);
      vm.execute(getTestTx([ // test every transfer type
        { amount: "0.01", asset: ETH, category: Fee, from: ethAccount, to: notMe },
        { amount: "0.04", asset: ETH, category: Income, from: notMe, to: ethAccount },
        { amount: "0.01", asset: ETH, category: Internal, from: ethAccount, to: venueAccount },
        { amount: "10", asset: DAI, category: Borrow, from: venueAccount, to: ethAccount },
        { amount: "0.02", asset: ETH, category: SwapOut, from: ethAccount, to: notMe },
        { amount: "10", asset: DAI, category: SwapIn, from: notMe, to: ethAccount },
        { amount: "0.01", asset: ETH, category: Refund, from: notMe, to: ethAccount },
        { amount: "5", asset: DAI, category: Expense, from: ethAccount, to: notMe },
        { amount: "15", asset: DAI, category: Repay, from: ethAccount, to: venueAccount },
      ]));
    });
    const lastRate = getRate(n);
    const totalRate = n * 1000 / (Date.now() - begin);
    log.info(`Average rate for all ${n} txns was ${totalRate} tx/s`);
    expect(totalRate).to.be.above(100);
    expect(lastRate).to.be.above(100);
  });
});
