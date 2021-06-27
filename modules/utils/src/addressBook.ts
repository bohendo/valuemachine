import { AddressBookJson } from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

export const getEmptyAddressBook = (): AddressBookJson => [];

const validateAddressBook = ajv.compile(AddressBookJson);
export const getAddressBookError = (addressBookJson: AddressBookJson): string | null =>
  validateAddressBook(addressBookJson)
    ? null
    : validateAddressBook.errors.length ? formatErrors(validateAddressBook.errors)
    : `Invalid AddressBook: ${JSON.stringify(addressBookJson)}`;
