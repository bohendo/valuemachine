import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { apps } from "./enums";

// Simple, standalone tokens only. App-specific tokens can be found in that app's parser.
export const addresses = [
  { name: `${apps.BJTJ}V1`, address: "Ethereum/0x13Ea3e8f20fdABb3996D7580DF50143b93E4ba27" },
  { name: `${apps.BJTJ}V2`, address: "Ethereum/0x2610a8d6602d7744174181348104DafC2aD94b28" },
].map(setAddressCategory(AddressCategories.Defi));

export const bjtjV1Address = addresses.find(e => e.name.endsWith("V1")).address;
export const bjtjV2Address = addresses.find(e => e.name.endsWith("V2")).address;
