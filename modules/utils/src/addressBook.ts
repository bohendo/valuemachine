import { AddressBookJson } from "@valuemachine/types";

export const getAddressBookError = (addressBookJson: AddressBookJson) => 
  addressBookJson ? null : "Address Book is falsy";

export const getEmptyAddressBook = (): AddressBookJson => [];
