import { Address, AddressBookJson } from "@valuemachine/types";
import Ajv from "ajv";
import addFormats from "ajv-formats";

// Setup
const ajv = addFormats(new Ajv()).addKeyword("kind");

export const getAddressBookError = (addressBookJson: AddressBookJson) => 
  !addressBookJson ? "Address Book is falsy"
  : !addressBookJson[0] ? null
  : !ajv.validate(Address, addressBookJson[0].address) ? "Invalid address at index 0"
  : null;

export const getEmptyAddressBook = (): AddressBookJson => [];
