import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { Apps } from "../../enums";

// Simple, standalone nfts only. App-specific nfts can be found in that app's parser.
export const addresses = [
  { name: Apps.Urbit, address: "Polygon/0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" },
  { name: Apps.ENS, address: "Polygon/0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" },
].map(setAddressCategory(AddressCategories.NFT));
