import { isAddress as isEthAddress } from "@ethersproject/address";
import {
  Account,
  AddressBook,
  AddressBookJson,
  AddressBookParams,
  AddressCategories,
  AddressCategory,
  AddressEntry,
  StoreKeys,
} from "@valuemachine/types";
import {
  fmtAddress,
  fmtAddressEntry,
  getAddressEntryError,
  getEmptyAddressBook,
  getLogger,
} from "@valuemachine/utils";

import { publicAddresses } from "./evm";

export const getAddressBook = (params?: AddressBookParams): AddressBook => {
  const { json: addressBookJson, hardcoded, logger, store } = params || {};
  const log = (logger || getLogger()).child({ module: "AddressBook" });
  const input = addressBookJson || store?.load(StoreKeys.AddressBook) || getEmptyAddressBook();
  const json = input.length ? (input as AddressEntry[]).reduce((out, entry) => {
    out[entry.address] = entry;
    return out;
  }, {}) : input as AddressBookJson;

  ////////////////////////////////////////
  // Init Code

  const addressBook = {};

  // Merge hardcoded public addresses with those supplied by the user
  [
    Object.values(json || {}),
    publicAddresses,
    hardcoded,
  ]
    .flat()
    .filter(entry => !!entry)
    .map(fmtAddressEntry)
    .forEach(entry => {
      if (!entry) {
        log.warn(entry, `Discarding empty entry`);
        return;
      }
      const error = getAddressEntryError(entry);
      if (error) {
        log.warn(entry, `Discarding entry: ${error}`);
      } else if (addressBook[entry.address]) {
        log.warn(entry, `Entry for ${entry.address} already exists, discarding duplicate`);
      } else {
        addressBook[entry.address] = entry;
      }
    });

  ////////////////////////////////////////
  // Helpers

  const getEntry = (address: Account): AddressEntry | undefined => {
    if (!address) return undefined;
    return addressBook[address] || (address.includes("/")
      ? addressBook[address.split("/").pop()]
      : Object.values(addressBook).find((entry: AddressEntry) => entry?.address?.endsWith(address))
    );
  };

  const isCategory = (category: AddressCategory) => (address: Account): boolean =>
    address && category && getEntry(address)?.category === category;

  ////////////////////////////////////////
  // Exports

  const isSelf = isCategory(AddressCategories.Self);

  const isToken = isCategory(AddressCategories.ERC20);

  // If venue is present, return venue/name else return name
  const getName = (address: Account): string => {
    if (!address) return "";
    const parts = address.split("/");
    const prefix = parts.length === 3 ? `${parts[1]}/` : "";
    const name = getEntry(address)?.name;
    if (name) return `${prefix}${name}`;
    const suffix = parts.pop();
    if (isEthAddress(suffix)) {
      const ethAddress = fmtAddress(suffix);
      if (parts.length > 0) {
        return `${prefix}${parts.join("/")}/${
          ethAddress.substring(0, 6)
        }..${ethAddress.substring(ethAddress.length - 4)}`;
      } else {
        return `${prefix}${ethAddress.substring(0, 6)}..${ethAddress.substring(ethAddress.length - 4)}`;
      }
    }
    return `${prefix}${suffix}`;
  };

  // Only really useful for ERC20 addresses
  const getDecimals = (address: Account): number =>
    getEntry(address)?.decimals || 18;

  const getCategory = (address: Account): AddressCategory =>
    getEntry(address)?.category || AddressCategories.Private;

  return {
    addresses: Object.keys(addressBook),
    selfAddresses: Object.keys(addressBook).filter(isSelf),
    getCategory,
    getDecimals,
    getName,
    isSelf,
    isToken,
    json,
  };
};
