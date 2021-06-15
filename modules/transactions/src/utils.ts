import {
  AddressBook,
  Transaction,
} from "@valuemachine/types";

export const describeTransaction = (addressBook: AddressBook, tx: Transaction): string => {
  return `${tx.method || "Method Call"} by ${addressBook.getName(
    addressBook.isSelf(tx.transfers[0].to) ? tx.transfers[0].to : tx.transfers[0].from
  )}`;
};
