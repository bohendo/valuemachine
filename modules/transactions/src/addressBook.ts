import { isAddress as isEthAddress, getAddress as getEthAddress } from "@ethersproject/address";
import {
  Account,
  AddressEntry,
  Address,
  AddressBook,
  AddressBookParams,
  AddressCategories,
  AddressCategory,
  EthereumSources,
  jurisdictions,
  PrivateCategories,
  PublicCategories,
  SecurityProvider,
  SecurityProviders,
  StoreKeys,
} from "@valuemachine/types";
import {
  getLogger,
  getEmptyAddressBook,
  fmtAddress,
  getAddressEntryError,
} from "@valuemachine/utils";

import { publicAddresses } from "./ethereum";

export const getAddressBook = (params?: AddressBookParams): AddressBook => {
  const { json: addressBookJson, hardcoded, logger, store } = params || {};
  const json = addressBookJson || store?.load(StoreKeys.AddressBook) || getEmptyAddressBook();
  const log = (logger || getLogger()).child({ module: "AddressBook" });

  ////////////////////////////////////////
  // Helpers

  const getEntry = (address: Address): AddressEntry | undefined =>
    addressBook.find(row => row.address === fmtAddress(address));

  ////////////////////////////////////////
  // Init Code

  // Merge hardcoded public addresses with those supplied by the user
  const addressBook = []
    .concat(publicAddresses, hardcoded, json)
    .filter(entry => !!entry);

  // Update input addresses w proper formatting eg valid checksums
  addressBook.forEach(row => {
    row.address = fmtAddress(row.address);
  });

  // Set default guardians
  addressBook.forEach(entry => {
    entry.guardian = entry.guardian || (
      isEthAddress(entry.address) ? SecurityProviders.ETH : SecurityProviders.None
    );
  });

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

  const getGuardian = (account: Account): SecurityProvider => {
    if (!account) return SecurityProviders.None;
    const guardian = getEntry(account)?.guardian;
    if (guardian) return guardian;
    const source = account.split("-")[0];
    if (Object.keys(EthereumSources).includes(source)) {
      return SecurityProviders.ETH;
    }
    return jurisdictions[source]
      || (Object.keys(SecurityProviders).includes(source) ? source : SecurityProviders.None);
  };

  // Only really useful for ERC20 addresses
  const getDecimals = (address: Address): number =>
    getEntry(address)?.decimals || 18;

  return {
    addresses,
    getName,
    getGuardian,
    getDecimals,
    isCategory,
    isPublic,
    isPrivate,
    isSelf,
    isToken,
    json,
  };
};
