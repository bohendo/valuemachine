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

  const isToken = isCategory(AddressCategories.Token);

  // If venue is present, return venue/name else return name
  const getName = (account: Account, prefix?: boolean): string => {
    if (!account) return "";
    const parts = account.split("/");
    let address = parts.pop();
    let name = getEntry(account)?.name || getEntry(address)?.name;
    if (isEthAddress(address)) {
      address = fmtAddress(address);
      name = name || `${address.substring(0, 6)}..${address.substring(address.length - 4)}`;
    } else {
      name = name || address;
    }
    return !prefix ? name : `${
      parts.length > 0 ? `${parts[0]}/` : ""
    }${
      parts.length > 1 ? `${parts[1]}/` : ""
    }${name}`;
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
