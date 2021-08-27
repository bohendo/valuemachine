import { getValueMachine } from "@valuemachine/core";
import { EvmApps, Assets, getAddressBook, getTransactions } from "@valuemachine/transactions";
import {
  AddressCategories,
  CsvSources,
  Guards,
  EventTypes,
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";

const coinbaseData =
`Timestamp,           Transaction Type,Asset,Quantity Transacted,      USD Spot Price at Transaction,USD Subtotal,USD Total (inclusive of fees),USD Fees,Notes
2018-01-01T01:00:00Z, Buy,             BTC,  0.1,                      1500.00,                      150.00,      165.00,                       15.00,   Bought 0.0300 BTC for $165.00 USD`;

export const csvFiles = [{
  name: "coinbase.csv",
  type: CsvSources.Coinbase,
  data: coinbaseData,
}];

const getAddress = (val: string): string => `Ethereum/0x${val.repeat(40).substring(0, 40)}`;
const one = getAddress("1");
const two = getAddress("2");
const three = getAddress("3");

export const balances = {
  ETH: "1.370",
  BTC: "0.137",
  USD: "1000.01",
  INR: "700000.07",
  DAI: "20000.02",
};

export const addressBook = getAddressBook({
  json: {
    [one]: {
      address: one,
      name: "self-1",
      category: AddressCategories.Self,
    },
    [two]: {
      address: two,
      name: "self-2",
      category: AddressCategories.Self,
    },
    [three]: {
      address: three,
      name: "other-3",
      category: AddressCategories.Private,
    },
  }
});

export const transactions = getTransactions({
  json: [{
    index: 0,
    date: "2020-01-01T01:00:00Z",
    hash: "0x0000000000000000000000000000000000000000000000000000000000000002",
    sources: [TransactionSources.Ethereum],
    apps: [EvmApps.ERC20],
    transfers: [{
      index: 0,
      category: TransferCategories.Income,
      asset: Assets.ETH,
      from: three,
      quantity: "1.02",
      to: one,
    }],
  }, {
    index: 1,
    date: "2020-01-02T01:00:00Z",
    hash: "0x0000000000000000000000000000000000000000000000000000000000000002",
    sources: [TransactionSources.Ethereum],
    apps: [EvmApps.ERC20],
    transfers: [{
      index: -1,
      category: TransferCategories.Expense,
      asset: Assets.ETH,
      from: one,
      quantity: "0.01",
      to: Guards.Ethereum,
    }, {
      index: 0,
      category: TransferCategories.Internal,
      asset: Assets.ETH,
      from: one,
      quantity: "1.01",
      to: two,
    }],
  }, {
    index: 2,
    date: "2020-01-03T01:00:00Z",
    hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
    sources: [TransactionSources.Ethereum],
    apps: [],
    transfers: [{
      index: -1,
      category: TransferCategories.Expense,
      asset: Assets.ETH,
      from: two,
      quantity: "0.01",
      to: Guards.Ethereum,
    }, {
      index: 0,
      category: TransferCategories.Expense,
      asset: Assets.ETH,
      from: two,
      quantity: "0.5",
      to: three,
    }],
  }],
});

export const vm = getValueMachine({
  json: {
    chunks: [{
      asset: Assets.ETH,
      quantity: "0.50",
      history: [
        { date: "2020-01-01T01:00:00Z", account: one },
        { date: "2020-01-02T01:00:00Z", account: two },
      ],
      account: one,
      disposeDate: "2020-01-03T01:00:00.000Z",
      index: 0,
      inputs: [],
      outputs: Array.from(Array(25).keys()) // inconsistent for demo purposes
    }, {
      asset: Assets.ETH,
      quantity: "0.01",
      history: [
        { date: "2020-01-01T01:00:00Z", account: one },
      ],
      disposeDate: "2020-01-02T01:00:00.000Z",
      index: 1,
      inputs: [],
      outputs: [],
    }, {
      asset: Assets.ETH,
      quantity: "0.01",
      history: [
        { date: "2020-01-01T01:00:00Z", account: one },
        { date: "2020-01-02T01:00:00Z", account: two },
      ],
      disposeDate: "2020-01-03T01:00:00.000Z",
      index: 2,
      inputs: [],
      outputs: [],
    }, {
      asset: Assets.ETH,
      quantity: "0.50",
      history: [
        { date: "2020-01-01T01:00:00Z", account: one },
        { date: "2020-01-02T01:00:00Z", account: two },
      ],
      index: 3,
      inputs: [],
      outputs: [],
    }, {
      asset: Assets.DAI,
      quantity: "50",
      history: [{ date: "2020-01-01T01:00:00Z", account: one }],
      account: two,
      index: 4,
      inputs: [],
      outputs: Array.from(Array(25).keys()) // inconsistent for demo purposes
    }],
    date: (new Date(0)).toISOString(),
    events: [{
      date: "2020-01-01T01:00:00Z", 
      newBalances: {}, // inconsistent for demo purposes
      index: 0,
      type: EventTypes.Income,
      account: one,
      inputs: [0, 1, 2],
    }, {
      date: "2020-01-02T01:00:00Z", 
      newBalances: {},
      index: 1,
      type: EventTypes.Expense,
      account: one,
      outputs: [1],
    }, {
      date: "2020-01-03T01:00:00Z", 
      newBalances: {},
      index: 2,
      type: EventTypes.Expense,
      account: two,
      outputs: [0, 2],
    }],
  },
});
