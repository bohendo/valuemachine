import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { Apps } from "../../enums";

const { ENS, OpenSea, Urbit } = Apps;

// Simple, standalone nfts only. App-specific nfts can be found in that app's parser.
const nftAddresses = [
  { name: `${Urbit}_Azimuth`, address: "Ethereum/0x6ac07b7c4601b5ce11de8dfe6335b871c7c4dd4d" },
  { name: ENS, address: `Ethereum/0x314159265dd8dbb310642f98f50c066173c1259b` },
].map(setAddressCategory(AddressCategories.NFT));

const supportingAddresses = [
  { name: `${ENS}_Controller`, address: `Ethereum/0x283af0b28c62c092c9727f1ee09c02ca627eb7f5` },
  { name: `${ENS}_OldRegistrar`, address: `Ethereum/0x6090a6e47849629b7245dfa1ca21d94cd15878ef` },
  { name: `${ENS}_Registrar`, address: `Ethereum/0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85` },
  { name: `${ENS}_Registrar`, address: `Ethereum/0xb22c1c159d12461ea124b0deb4b5b93020e6ad16` },
  { name: OpenSea, address: "Ethereum/0x7be8076f4ea4a4ad08075c2508e481d6c946d12b" },
].map(setAddressCategory(AddressCategories.Public));

export const addresses = [
  ...nftAddresses,
  ...supportingAddresses,
];
