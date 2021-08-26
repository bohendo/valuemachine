import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { apps } from "./enums";

// Simple, standalone tokens only. App-specific tokens can be found in that app's parser.
export const addresses = [
  { name: apps.EtherDelta, address: "Ethereum/0x8d12a197cb00d4747a1fe03395095ce2a5cc6819" },
].map(setAddressCategory(AddressCategories.Defi));

export const etherdeltaAddress = addresses.find(e => e.name === apps.EtherDelta).address;
