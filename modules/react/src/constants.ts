import { getValueMachine, getPrices } from "@valuemachine/core";
import {
  Assets,
  CsvSources,
  getAddressBook,
  getTestTx,
  getTransactions,
  Guards,
  Sources,
} from "@valuemachine/transactions";
import {
  AddressCategories,
  TransferCategories,
} from "@valuemachine/types";

const { BCH, BTC, DAI, ETH, UNI, INR, USD } = Assets;
const { Internal, Expense, Income, SwapIn, SwapOut } = TransferCategories;
const { Ethereum, USA } = Guards;

const coinbaseData =
`DateTime,Transaction Type,Asset,Quantity Transacted,USD Spot Price at Transaction,USD Subtotal,USD Total (inclusive of fees),USD Fees,Notes
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
    { category: Income, asset: ETH, from: three, amount: "1.04", to: one },
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
  }],
});

export const vm = getValueMachine();
// Generate value machine data from transactions
transactions.json.forEach(tx => vm.execute(tx));

console.log(`Setting price on date ${transactions.json[4].date}`);
const today = new Date().toISOString().split("T")[0];
export const prices = getPrices({
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
  ["Ethereum/0xdd6beaa1dfed839747217c721696d81984e2507ef973cd3efb9e0cfe486a0b80"]: {
    description: "Oops I committed another felony",
  },
  ["Ethereum/0x5e70e647a5dee8cc7eaddc302f2a7501e29ed00d325eaec85a3bde5c02abf1ec"]: {
    description: "Oops I committed a felony",
    multiplier: "2.71",
  },
};
