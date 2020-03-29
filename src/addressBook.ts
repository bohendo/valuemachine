import { env } from "./env";
import { Address, AddressBook, InputData } from "./types";
import { Logger } from "./utils";

export const getAddressBook = (input: InputData): AddressBook => {
  const log = new Logger("AddressBook", env.logLevel);

  const addressBook = input.addressBook;

  const sm = (str: string): string =>
    str.toLowerCase();

  const smeq = (str1: string, str2: string): boolean =>
    sm(str1) === sm(str2);

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

  const getName = (address: Address): string =>
    !address
      ? ""
      : addressBook.find(a => smeq(a.address, address))
      ? addressBook.find(a => smeq(a.address, address)).name
      : address.substring(0, 8);

  const isCategory = (address: Address, category: string): boolean =>
    address && addressBook
      .filter(a => smeq(a.category, category))
      .map(a => sm(a.address))
      .includes(sm(address));

  const isTagged = (address: Address, tag: string): boolean =>
    address && addressBook
      .filter(a => a.tags.includes(tag))
      .map(a => sm(a.address))
      .includes(sm(address));

  const isSelf = (address: Address): boolean =>
    isCategory(address, "self");

  const shouldIgnore = (address: Address): boolean =>
    isTagged(address, "ignore");

  const pretty = (address: Address): string =>
    getName(address) || (isSelf(address)
      ? "self"
      : address
        ? address.substring(0, 10)
        : "null");

  return {
    addresses: input.addressBook,
    getName,
    isCategory,
    isSelf,
    isTagged,
    pretty,
    shouldIgnore,
  };
};
