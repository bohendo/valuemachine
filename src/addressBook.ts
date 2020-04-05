import { env } from "./env";
import { Address, AddressBook, InputData } from "./types";
import { Logger } from "./utils";

export const getAddressBook = (input: InputData): AddressBook => {
  const addressBook = input.addressBook;

  ////////////////////////////////////////
  // Internal Functions

  const log = new Logger("AddressBook", env.logLevel);

  const sm = (str: string): string =>
    str.toLowerCase();

  const smeq = (str1: string, str2: string): boolean =>
    sm(str1) === sm(str2);

  const isCategory = (category: string) => (address: Address): boolean =>
    address && addressBook
      .filter(a => smeq(a.category, category))
      .map(a => sm(a.address))
      .includes(sm(address));

  const isTagged = (tag: string) => (address: Address): boolean =>
    address && addressBook
      .filter(a => a.tags.includes(tag))
      .map(a => sm(a.address))
      .includes(sm(address));

  ////////////////////////////////////////
  // Exported Functions

  // Sanity check: it shouldn't have two entries for the same address
  const addresses = [];
  addressBook.forEach(a => {
    if (addresses.includes(sm(a.address))) {
      throw new Error(`Address book has multiple entries for addres ${a.address}`);
    } else {
      addresses.push(sm(a.address));
    }
  });
  log.info(`Address book verified`);

  const isToken = isCategory("erc20");
  const isSelf = isCategory("self");
  const shouldIgnore = isTagged("ignore");

  const getName = (address: Address): string =>
    !address
      ? ""
      : addressBook.find(a => smeq(a.address, address))
      ? addressBook.find(a => smeq(a.address, address)).name
      : address.substring(0, 8);

  const pretty = (address: Address): string =>
    getName(address) || (isSelf(address)
      ? "self"
      : address
        ? address.substring(0, 10)
        : "null");

  return {
    addresses,
    getName,
    isSelf,
    isToken,
    pretty,
    shouldIgnore,
  };
};
