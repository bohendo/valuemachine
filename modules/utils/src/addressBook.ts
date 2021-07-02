import { isAddress as isEthAddress, getAddress as getEthAddress } from "@ethersproject/address";
import {
  AddressBookJson,
  AddressCategory,
  AddressEntry,
  Guards,
} from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

export const getEmptyAddressBook = (): AddressBookJson => [];

////////////////////
// Validators

const validateAddressBook = ajv.compile(AddressBookJson);
const validateAddressEntry = ajv.compile(AddressEntry);

export const getAddressBookError = (addressBookJson: AddressBookJson): string | null =>
  validateAddressBook(addressBookJson)
    ? null
    : validateAddressBook.errors.length ? formatErrors(validateAddressBook.errors)
    : `Invalid AddressBook: ${JSON.stringify(addressBookJson)}`;

export const getAddressEntryError = (addressEntry: AddressEntry): string | null =>
  validateAddressEntry(addressEntry)
    ? null
    : validateAddressEntry.errors.length ? formatErrors(validateAddressEntry.errors)
    : `Invalid AddressBook Entry: ${JSON.stringify(addressEntry)}`;

////////////////////
// Formatters

export const fmtAddress = (address: string) =>
  isEthAddress(address) ? getEthAddress(address) : address;

export const fmtAddressEntry = (entry: AddressEntry): AddressEntry => {
  entry.address = fmtAddress(entry.address);
  entry.guard = entry.guard || (
    isEthAddress(entry.address) ? Guards.ETH : Guards.None
  );
  const error = getAddressEntryError(entry);
  if (error) throw new Error(error);
  return entry;
};

export const setAddressCategory = (category: AddressCategory) =>
  (entry: Partial<AddressEntry>): AddressEntry =>
    fmtAddressEntry({ ...entry, category } as AddressEntry);
