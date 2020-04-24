import { Address } from "@finances/types";
import { getAddress } from "ethers/utils";

import { AddressBookJson, AddressBook, ILogger } from "./types";
import { ContextLogger } from "./utils";

export const getAddressBook = (addressBook: AddressBookJson, logger?: ILogger): AddressBook => {

  ////////////////////////////////////////
  // Internal Functions

  const log = new ContextLogger("AddressBook", logger);

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
  // Init Code

  // Sanity check: it shouldn't have two entries for the same address
  let addresses = [];
  addressBook.forEach(a => {
    if (addresses.includes(sm(a.address))) {
      throw new Error(`Address book has multiple entries for address ${a.address}`);
    } else if (!getAddress(a.address)) {
      throw new Error(`Address book contains invalid address ${a.address}`);
    } else {
      addresses.push(sm(a.address));
    }
  });
  addresses = addresses.sort();
  log.info(`Address book verified`);

  ////////////////////////////////////////
  // Exported Functions

  const isDefi = isTagged("defi");
  const isExchange = isTagged("exchange");
  const isFamily = (address: Address): boolean =>
    isCategory("family")(address) || isCategory("friend")(address);
  const isSelf = isCategory("self");
  const isToken = isCategory("erc20");
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
    isDefi,
    isExchange,
    isFamily,
    isSelf,
    isToken,
    pretty,
    shouldIgnore,
  };
};
