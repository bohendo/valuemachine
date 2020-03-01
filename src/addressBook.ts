import { AddressBook, InputData } from "./types";

export const getAddressBook = (input: InputData): AddressBook => {

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

  const getName = (address: string | null): string =>
    !address
      ? ""
      : addressBook.find(a => smeq(a.address, address))
      ? addressBook.find(a => smeq(a.address, address)).name
      : "";

  const isCategory = (address: string | null, category: string): boolean =>
    address && addressBook
      .filter(a => smeq(a.address, category))
      .map(a => sm(a.address))
      .includes(sm(address));

  const isTagged = (address: string | null, tag: string): boolean =>
    address && addressBook
      .filter(a => a.tags.includes(tag))
      .map(a => sm(a.address))
      .includes(sm(address));

  const isSelf = (address: string | null): boolean =>
    isCategory(address, "self");

  const shouldIgnore = (address: string | null): boolean =>
    isTagged(address, "ignore");

  const pretty = (address: string): string =>
    getName(address) || (isSelf(address)
      ? "self"
      : address.substring(0, 10));

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
