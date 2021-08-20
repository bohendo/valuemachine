import { getAddressBook } from "@valuemachine/transactions";
import {
  AddressCategories,
} from "@valuemachine/types";

const getAddress = (val: string): string => `0x${val.repeat(40).substring(0, 40)}`;

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
