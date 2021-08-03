import { isAddress as isEvmAddress, getAddress as getEvmAddress } from "@ethersproject/address";
import {
  AddressBookJson,
  AddressCategory,
  AddressEntry,
  Guard,
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

export const fmtAddress = (address: string) => {
  if (address.includes(":")) {
    const parts = address.split(":");
    const suffix = parts.pop();
    const prefix = parts.join(":"); // leftover after popping the address off
    return `${prefix}:${isEvmAddress(suffix) ? getEvmAddress(suffix) : suffix}`;
  } else {
    return isEvmAddress(address) ? getEvmAddress(address) : address;
  }
};

export const fmtAddressEntry = (entry: AddressEntry): AddressEntry => {
  entry.address = fmtAddress(entry.address);
  entry.guard = entry.guard || (
    isEvmAddress(entry.address) ? Guards.Ethereum : Guards.None
  );
  const error = getAddressEntryError(entry);
  if (error) throw new Error(error);
  return entry;
};

export const setAddressCategory = (category: AddressCategory, guard?: Guard) =>
  (entry: Partial<AddressEntry>): AddressEntry =>
    fmtAddressEntry({
      ...entry,
      category,
      guard: guard || entry.guard || isEvmAddress(entry.address) ? Guards.Ethereum : Guards.None,
    } as AddressEntry);
