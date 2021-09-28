import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { assets } from "./enums";

export const addresses = [
  { name: assets.WETH, address: "Ethereum/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" },
  { name: assets.WMATIC, address: "Polygon/0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" },
].map(setAddressCategory(AddressCategories.ERC20));

export const wethAddress = addresses.find(e => e.name === assets.WETH)?.address;
export const wmaticAddress = addresses.find(e => e.name === assets.WMATIC)?.address;
