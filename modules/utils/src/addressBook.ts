import { AddressBookJson } from "@valuemachine/types";
import Ajv from "ajv";
import addFormats from "ajv-formats";

export const getEmptyAddressBook = (): AddressBookJson => [];

const ajv = addFormats(new Ajv()).addKeyword("kind").addKeyword("modifier");
const validateAddressBook = ajv.compile(AddressBookJson);

const formatErrors = errors => errors.map(error =>
  `${error.instancePath.replace("", "")}: ${error.message}`
).slice(0, 2).join(", ");

export const getAddressBookError = (addressBookJson: AddressBookJson): string | null =>
  validateAddressBook(addressBookJson)
    ? null
    : validateAddressBook.errors.length ? formatErrors(validateAddressBook.errors)
    : `Invalid AddressBook: ${JSON.stringify(addressBookJson)}`;
