import {
  Address,
  AddressBook,
  AddressBookJson,
  AddressCategories,
  ILogger,
} from "@finances/types";
import { getAddress } from "ethers/utils";

import { ContextLogger } from "./utils";

export const getAddressBook = (userAddressBook: AddressBookJson, logger?: ILogger): AddressBook => {
  const log = new ContextLogger("AddressBook", logger);

  ////////////////////////////////////////
  // Hardcoded Public Addresses

  const cTokens = [
    { address: "0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e", name: "cBAT" },
    { address: "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", name: "cDAI" },
    { address: "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", name: "cETH" },
    { address: "0x158079ee67fce2f58472a96584a73c7ab9ac95c1", name: "cREP" },
    { address: "0xf5dce57282a584d2746faf1593d3121fcac444dc", name: "cSAI" },
    { address: "0x39aa39c021dfbae8fac545936693ac917d5e7563", name: "cUSD" },
    { address: "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4", name: "cWBTC" },
    { address: "0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407", name: "cZRX" },
  ].map(row => ({ ...row, category: AddressCategories.CToken })) as AddressBookJson;

  const addressBook = cTokens.concat(userAddressBook);

  ////////////////////////////////////////
  // Internal Functions

  const sm = (str: string): string =>
    str.toLowerCase();

  const smeq = (str1: string, str2: string): boolean =>
    sm(str1) === sm(str2);

  const isInnerCategory = (category: AddressCategories) => (address: Address): boolean =>
    address && addressBook
      .filter(row => smeq(row.category, category))
      .map(row => sm(row.address))
      .includes(sm(address));

  const isTagged = (tag: AddressCategories) => (address: Address): boolean =>
    address && addressBook
      .filter(row => row.tags && row.tags.includes(tag))
      .map(row => sm(row.address))
      .includes(sm(address));

  ////////////////////////////////////////
  // Init Code

  // Sanity check: it shouldn't have two entries for the same address
  let addresses = [];
  addressBook.forEach(row => {
    if (addresses.includes(sm(row.address))) {
      log.warn(`Address book has multiple entries for address ${row.address}`);
    } else if (!getAddress(row.address)) {
      throw new Error(`Address book contains invalid address ${row.address}`);
    } else {
      addresses.push(sm(row.address));
    }
  });
  addresses = addresses.sort();
  log.info(`Address book verified`);

  ////////////////////////////////////////
  // Exported Functions

  const isCategory = (category: AddressCategories) => (address: Address): boolean =>
    isInnerCategory(category)(address) || isTagged(category)(address);

  const isSelf = isCategory(AddressCategories.Self);

  const isToken = (address: Address): boolean =>
    isCategory(AddressCategories.Erc20)(address) || isCategory(AddressCategories.CToken)(address);

  const getName = (address: Address): string =>
    !address
      ? ""
      : addressBook.find(row => smeq(row.address, address))
      ? addressBook.find(row => smeq(row.address, address)).name
      : address.substring(0, 8);

  return {
    addresses,
    getName,
    isCategory,
    isSelf,
    isToken,
  };
};
