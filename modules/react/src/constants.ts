import { getValueMachine } from "@valuemachine/core";
import { getPriceFns } from "@valuemachine/prices";
import {
  AddressCategories,
  Assets,
  CsvSources,
  getAddressBook,
  getTestTx,
  getTransactions,
  Guards,
  Sources,
  TransferCategories,
} from "@valuemachine/transactions";

const { BCH, BTC, DAI, ETH, UNI, INR, USD } = Assets;
const { Internal, Expense, Income, SwapIn, SwapOut } = TransferCategories;
const { Ethereum, USA } = Guards;

const coinbaseData =
`Timestamp,Transaction Type,Asset,Quantity Transacted,USD Spot Price at Transaction,USD Subtotal,USD Total (inclusive of fees),USD Fees,Notes
2018-01-01T01:00:00Z,Buy,BTC,0.1,1500.00,150.00,165.00,15.00,Bought 0.0300 BTC for $165.00 USD`;

const digest = "afa4c4f3";
export const csvFiles = {
  [digest]: {
    data: coinbaseData,
    digest,
    name: "coinbase.csv",
    source: CsvSources.Coinbase,
  },
};

export const bytes32 = `0x${"12345".repeat(64).substring(0, 64)}`;
export const uuid = `Ethereum/${bytes32}`;

const getAddress = (val: string): string => `0x${val.repeat(40).substring(0, 40)}`;
export const address = getAddress("1");

const getAccount = (val: string): string => `Ethereum/${getAddress(val)}`;
export const account = getAccount("1");

const one = account;
const two = getAccount("2");
const three = getAccount("3");
const coinbase = `${USA}/${Sources.Coinbase}/account`;
const exchange = `${USA}/${Sources.Coinbase}`;

export const guard = USA;
export const unit = USD;

export const balances = {
  BCH: "0",
  BTC: "0.137",
  DAI: "20000.02",
  ETH: "1.370",
  INR: "700000.07",
  USD: "1000.01",
};

export const addressBook = getAddressBook({
  json: {
    [one]: {
      address: one,
      name: "one",
      category: AddressCategories.Self,
    },
    [two]: {
      address: two,
      name: "two",
      category: AddressCategories.Self,
      guard,
    },
    [three]: {
      address: three,
      name: "three",
      category: AddressCategories.Private,
    },
  }
});

export const transactions = getTransactions({
  json: [getTestTx([
    // Income
    { category: Income, asset: ETH, from: three, amount: "1.04", to: one, index: 1 },
  ]), getTestTx([
    // Internal transfer
    { category: Expense, asset: ETH, from: one, amount: "0.01", to: Ethereum },
    { index: 0, category: Internal, asset: ETH, from: one, amount: "1.03", to: two },
  ]), getTestTx([
    // Expense
    { category: Expense, asset: ETH, from: two, amount: "0.01", to: Ethereum },
    { category: Expense, asset: ETH, from: two, amount: "0.5", to: three },
  ]), getTestTx([
    // Trade
    { category: Expense, asset: ETH, from: two, amount: "0.01", to: Ethereum },
    { category: SwapOut, asset: ETH, from: two, amount: "0.25", to: three },
    { category: SwapIn, asset: UNI, from: three, amount: "200", to: two },
  ]), getTestTx([
    // Deposit
    { category: Expense, asset: ETH, from: two, amount: "0.01", to: Ethereum },
    { category: Internal, asset: UNI, from: two, amount: "200", to: coinbase },
  ]), {
    ...getTestTx([
      // Sale
      { category: SwapOut, asset: UNI, from: coinbase, amount: "200", to: exchange },
      { category: SwapIn, asset: USD, from: exchange, amount: "1200", to: coinbase },
    ]),
    method: "Sale",
    sources: ["Coinbase"],
  }, getTestTx([
    // Income
    { category: Income, asset: ETH, from: three, amount: "0.137", to: one, index: 1 },
  ])],
});

export const vm = getValueMachine();
// Generate value machine data from transactions
transactions.json.forEach(tx => vm.execute(tx));

console.log(`Setting price on date ${transactions.json[4].date}`);
const today = new Date().toISOString().split("T")[0];
export const prices = getPriceFns({
  json: {
    [today]: { [USD]: {
      [BCH]: "580",
      [BTC]: "55000",
      [DAI]: "1.01",
      [ETH]: "3500",
      [INR]: "0.0133",
    } },
    // At the time of depositing UNI onto coinbase
    [transactions.json[4].date.split("T")[0]]: { [USD]: { [UNI]: "4" } },
    // At the time of selling UNI on coinbase
    [transactions.json[5].date.split("T")[0]]: { [USD]: { [UNI]: "6" } },
  },
});
prices.syncChunks(vm.json.chunks);

export const txTags = {
  ["Test/0x0000000000000000000000000000000000000000000000000000000000000000/1"]: {
    description: "I won a prize",
    incomeType: "Prize",
    multiplier: "0.5",
    physicalGuard: "USA",
  },
  ["Test/0x0000000000000000000000000000000000000000000000000000000000000006/1"]: {
    description: "I won another prize",
    incomeType: "Prize",
    multiplier: "0.33",
    physicalGuard: "IND",
  },
};

export const taxInput = {
  personal: {
    firstName: "Bo",
  },
};
