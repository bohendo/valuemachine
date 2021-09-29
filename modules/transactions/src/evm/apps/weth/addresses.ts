import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { Tokens, Apps } from "../../enums";

const gatewayAddresses = [
  { name: Apps.WethGateway, address: "Polygon/0xbEadf48d62aCC944a06EEaE0A9054A90E5A7dc97" },
].map(setAddressCategory(AddressCategories.Proxy));

const tokenAddresses = [
  { name: Tokens.WETH, address: "Ethereum/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" },
  { name: Tokens.WMATIC, address: "Polygon/0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" },
].map(setAddressCategory(AddressCategories.Token));

export const addresses = [
  ...gatewayAddresses,
  ...tokenAddresses,
];

export const wethAddress = addresses.find(e => e.name === Tokens.WETH)?.address;
export const wmaticAddress = addresses.find(e => e.name === Tokens.WMATIC)?.address;
export const gatewayAddress = addresses.find(e => e.name === Apps.WethGateway)?.address;
