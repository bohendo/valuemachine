import { getAddressBook } from "@valuemachine/transactions";
import {
  AddressCategories,
  CsvSources,
} from "@valuemachine/types";

const getAddress = (val: string): string => `0x${val.repeat(40).substring(0, 40)}`;

const coinbaseData =
`Timestamp,           Transaction Type,Asset,Quantity Transacted,      USD Spot Price at Transaction,USD Subtotal,USD Total (inclusive of fees),USD Fees,Notes
2018-01-01T01:00:00Z, Buy,             BTC,  0.1,                      1500.00,                      150.00,      165.00,                       15.00,   Bought 0.0300 BTC for $165.00 USD`;

export const csvFiles = [{
  name: "coinbase.csv",
  type: CsvSources.Coinbase,
  data: coinbaseData,
}];

export const addressBook = getAddressBook({
  json: {
    [getAddress("1")]: {
      address: getAddress("1"),
      name: "self-1",
      category: AddressCategories.Self,
    },
    [getAddress("2")]: {
      address: getAddress("2"),
      name: "self-2",
      category: AddressCategories.Self,
    },
    [getAddress("3")]: {
      address: getAddress("3"),
      name: "other-3",
      category: AddressCategories.Private,
    },
  }
});
