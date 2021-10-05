import { isAddress as isEvmAddress, getAddress as getEvmAddress } from "@ethersproject/address";
import {
  Account,
  AddressBookJson,
  AddressCategory,
  AddressCategories,
  AddressEntry,
} from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

export const getEmptyAddressBook = (): AddressBookJson => ({});

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
  if (address.includes("/")) {
    const parts = address.split("/");
    const suffix = parts.pop();
    const prefix = parts.join("/"); // leftover after popping the address off
    return `${prefix}/${isEvmAddress(suffix) ? getEvmAddress(suffix) : suffix}`;
  } else {
    return isEvmAddress(address) ? getEvmAddress(address) : address;
  }
};

export const insertVenue = (account?: Account, venue?: string): string => {
  if (!account) return "";
  if (!venue) return account;
  const parts = account.split("/");
  parts.splice(-1, 0, venue);
  return fmtAddress(parts.join("/"));
};

export const fmtAddressEntry = (entry: AddressEntry): AddressEntry => {
  const error = getAddressEntryError(entry);
  if (error) throw new Error(error);
  entry.address = fmtAddress(entry.address);
  return entry;
};

// Careful: this will silently discard duplicate entries
export const fmtAddressBook = (addressBookJson: AddressBookJson): AddressBookJson => {
  const error = getAddressBookError(addressBookJson);
  if (error) throw new Error(error);
  const cleanAddressBook = {} as AddressBookJson;
  Object.keys(addressBookJson).forEach(address => {
    const cleanAddress = fmtAddress(address);
    cleanAddressBook[cleanAddress] = {
      ...addressBookJson[address],
      ...addressBookJson[cleanAddress], // perfer data from checksummed address entries
      address: cleanAddress,
    };
  });
  return cleanAddressBook;
};

export const setAddressCategory = (category: AddressCategory) =>
  (entry: Partial<AddressEntry>): AddressEntry =>
    fmtAddressEntry({
      ...entry,
      category,
    } as AddressEntry);

// Puts addresses most relevant to the user first
export const sortAddressEntries = (addressEntries: AddressEntry[]): AddressEntry[] =>
  addressEntries.sort((e1, e2) =>
    // put self addresses first
    (e1.category !== AddressCategories.Self && e2.category === AddressCategories.Self) ? 1
    : (e1.category === AddressCategories.Self && e2.category !== AddressCategories.Self) ? -1
    // sort by category
    : (e1.category.toLowerCase() > e2.category.toLowerCase()) ? 1
    : (e1.category.toLowerCase() < e2.category.toLowerCase()) ? -1
    // then sort by name
    : (e1.name.toLowerCase() > e2.name.toLowerCase()) ? 1
    : (e1.name.toLowerCase() < e2.name.toLowerCase()) ? -1
    // then sort by address
    : (e1.address.toLowerCase() > e2.address.toLowerCase()) ? 1
    : (e1.address.toLowerCase() < e2.address.toLowerCase()) ? -1
    : 0
  );
