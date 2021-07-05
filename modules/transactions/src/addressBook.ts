import { isAddress as isEthAddress } from "@ethersproject/address";
import {
  Account,
  AddressEntry,
  Address,
  AddressBook,
  AddressBookParams,
  AddressCategories,
  AddressCategory,
  EthereumSources,
  guards,
  PrivateCategories,
  PublicCategories,
  Guard,
  Guards,
  StoreKeys,
} from "@valuemachine/types";
import {
  fmtAddress,
  fmtAddressEntry,
  getAddressBookError,
  getAddressEntryError,
  getEmptyAddressBook,
  getLogger,
} from "@valuemachine/utils";

import { publicAddresses } from "./ethereum";

export const getAddressBook = (params?: AddressBookParams): AddressBook => {
  const { json: addressBookJson, hardcoded, logger, store } = params || {};
  const json = addressBookJson || store?.load(StoreKeys.AddressBook) || getEmptyAddressBook();
  const log = (logger || getLogger()).child({ module: "AddressBook" });

  ////////////////////////////////////////
  // Helpers

  const getEntry = (address: Address): AddressEntry | undefined => {
    const target = fmtAddress(address);
    return addressBook.find(row => row.address === target);
  };

  ////////////////////////////////////////
  // Init Code

  // Merge hardcoded public addresses with those supplied by the user
  const addressBook = []
    .concat(publicAddresses, hardcoded, json)
    .filter(entry => !!entry)
    .map(fmtAddressEntry);

  const error = getAddressBookError(addressBook);
  if (error) throw new Error(error);

  // Sanity check: it shouldn't have two entries for the same address
  let addresses = [];
  addressBook.forEach(row => {
    const error = getAddressEntryError(row);
    if (error) throw new Error(error);
    if (addresses.includes(row.address)) {
      log.warn(`Address book has multiple entries for address ${row.address}`);
    }
    addresses.push(row.address);
  });
  addresses = addresses.sort();

  ////////////////////////////////////////
  // Exports

  const isCategory = (category: AddressCategory) => (address: Address): boolean =>
    address && category && getEntry(address)?.category === category;

  const isPublic = (address: Address): boolean => {
    const entry = getEntry(address);
    return entry && Object.keys(PublicCategories).some(category => category === entry.category);
  };

  const isPrivate = (address: Address): boolean => {
    const entry = getEntry(address);
    return entry && Object.keys(PrivateCategories).some(category => category === entry.category);
  };

  const isSelf = isCategory(AddressCategories.Self);

  const isToken = isCategory(AddressCategories.ERC20);

  const getName = (address: Address): string => {
    if (!address) return "";
    const name = getEntry(address)?.name;
    if (name) return name;
    if (isEthAddress(address)) {
      const ethAddress = fmtAddress(address);
      return `${ethAddress.substring(0, 6)}..${ethAddress.substring(ethAddress.length - 4)}`;
    }
    return address;
  };

  const getGuard = (account: Account): Guard => {
    if (!account) return Guards.None;
    const guard = getEntry(account)?.guard;
    if (guard) return guard;
    if (!account.includes("-")) {
      return isEthAddress(account) ? Guards.ETH : Guards.None;
    }
    const prefix = account.split("-")[0];
    if (!prefix) return Guards.None;
    if (Object.keys(EthereumSources).includes(prefix)) {
      return Guards.ETH;
    }
    return guards[prefix] || prefix;
  };

  // Only really useful for ERC20 addresses
  const getDecimals = (address: Address): number =>
    getEntry(address)?.decimals || 18;

  return {
    addresses,
    getName,
    getGuard,
    getDecimals,
    isCategory,
    isPublic,
    isPrivate,
    isSelf,
    isToken,
    json,
  };
};
