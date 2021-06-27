import { isAddress } from "@ethersproject/address";
import { AddressBookJson } from "@valuemachine/types";

export const getAddressBookError = (addressBookJson: AddressBookJson) => 
  !addressBookJson ? "Address Book is falsy"
  : !addressBookJson[0] ? null
  : !isAddress(addressBookJson[0].address) ? "Invalid address at index 0"
  : null;

export const getEmptyAddressBook = (): AddressBookJson => [];
