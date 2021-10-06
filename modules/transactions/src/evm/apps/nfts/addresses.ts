import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { Apps } from "../../enums";

const { OpenSea, Urbit } = Apps;

// Simple, standalone nfts only. App-specific nfts can be found in that apps parser.
const nftAddresses = [
  { name: `Loot`, address: "Ethereum/0xff9c1b15b16263c61d017ee9f65c50e4ae0113d7" },
  { name: `${Urbit}_Azimuth`, address: "Ethereum/0x6ac07b7c4601b5ce11de8dfe6335b871c7c4dd4d" },
].map(setAddressCategory(AddressCategories.NFT));

export const marketAddresses = [
  { name: OpenSea, address: "Ethereum/0x7be8076f4ea4a4ad08075c2508e481d6c946d12b" },
].map(setAddressCategory(AddressCategories.Exchange));

export const addresses = [
  ...marketAddresses,
  ...nftAddresses,
];
