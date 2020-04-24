import {
  Address,
  AddressBook,
  AddressBookJson,
  AddressCategories,
  ILogger,
} from "@finances/types";
import { getAddress } from "ethers/utils";

import { ContextLogger } from "./utils";

export const getAddressBook = (addressBook: AddressBookJson, logger?: ILogger): AddressBook => {

  ////////////////////////////////////////
  // Hardcoded Public Addresses

/*
  const cTokens = {
    "cBAT": "0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e",
    "cDAI": "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643",
    "cETH": "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5",
    "cREP": "0x158079ee67fce2f58472a96584a73c7ab9ac95c1",
    "cSAI": "0xf5dce57282a584d2746faf1593d3121fcac444dc",
    "cUSD": "0x39aa39c021dfbae8fac545936693ac917d5e7563",
    "cWBTC": "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4",
    "cZRX": "0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407",
  };
*/

  ////////////////////////////////////////
  // Internal Functions

  const log = new ContextLogger("AddressBook", logger);

  const sm = (str: string): string =>
    str.toLowerCase();

  const smeq = (str1: string, str2: string): boolean =>
    sm(str1) === sm(str2);

  const isInnerCategory = (category: AddressCategories) => (address: Address): boolean =>
    address && addressBook
      .filter(a => smeq(a.category, category))
      .map(a => sm(a.address))
      .includes(sm(address));

  const isTagged = (tag: AddressCategories) => (address: Address): boolean =>
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

  const isCategory = (category: AddressCategories) => (address: Address): boolean =>
    isInnerCategory(category)(address) || isTagged(category)(address);

  const isDefi = isCategory(AddressCategories.Defi);
  const isExchange = isCategory(AddressCategories.Exchange);
  const isFamily = isCategory(AddressCategories.Family);
  const isSelf = isCategory(AddressCategories.Self);
  const isToken = isCategory(AddressCategories.Erc20);
  const shouldIgnore = isCategory(AddressCategories.Ignore);

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
    isCategory,
    isDefi,
    isExchange,
    isFamily,
    isSelf,
    isToken,
    pretty,
    shouldIgnore,
  };
};
