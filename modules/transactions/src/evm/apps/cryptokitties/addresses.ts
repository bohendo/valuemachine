import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { Apps } from "../../enums";

export const addresses = [{
  address: "Ethereum/0x06012c8cf97BEaD5deAe237070F9587f8E7A266d",
  name: `${Apps.CryptoKitties}_Core`,
}, {
  address: "Ethereum/0xb1690c08e213a35ed9bab7b318de14420fb57d8c",
  name: `${Apps.CryptoKitties}_Auction`,
}, {
  address: "Ethereum/0xc7af99fe5513eb6710e6d5f44f9989da40f27f26",
  name: `${Apps.CryptoKitties}_ClockAuction`,
}].map(setAddressCategory(AddressCategories.Public));
