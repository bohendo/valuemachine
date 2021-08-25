import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { EvmAssets } from "../../enums";

import { assets } from "./enums";

export const addresses = [
  { name: assets.WETH, address: "Ethereum/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" },
].map(setAddressCategory(AddressCategories.ERC20));

export const wethAddress = addresses.find(e => e.name === EvmAssets.ETH).address;
