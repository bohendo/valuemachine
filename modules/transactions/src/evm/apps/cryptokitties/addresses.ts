import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { Apps } from "../../enums";

const { CryptoKitties } = Apps;

// Cryptokitties don't conform to the NFT standard so core can't be treated as a regular old NFT
export const addresses = [{
  address: "Ethereum/0x06012c8cf97BEaD5deAe237070F9587f8E7A266d",
  name: CryptoKitties,
}, {
  address: "Ethereum/0xb1690c08e213a35ed9bab7b318de14420fb57d8c",
  name: `${CryptoKitties}_Auction`,
}, {
  address: "Ethereum/0xc7af99fe5513eb6710e6d5f44f9989da40f27f26",
  name: `${CryptoKitties}_ClockAuction`,
}].map(setAddressCategory(AddressCategories.Public));
