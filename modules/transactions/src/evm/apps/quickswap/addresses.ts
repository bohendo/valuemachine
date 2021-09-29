import {
  AddressCategories,
} from "@valuemachine/types";
import { setAddressCategory } from "@valuemachine/utils";

import { Tokens } from "../../enums";

const govAddresses = [
  { name: Tokens.QUICK, address: "Polygon/0x831753dd7087cac61ab5644b308642cc1c33dc13" },
].map(setAddressCategory(AddressCategories.ERC20));

const routerAddresses = [
  { name: "Quickswap", address: "Polygon/0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff" },
].map(setAddressCategory(AddressCategories.Defi));

const marketAddresses = [
  { name: "Quickswap_DAI_USDC", address: "Polygon/0xf04adBF75cDFc5eD26eeA4bbbb991DB002036Bdd" },
  { name: "Quickswap_MATIC_USDC", address: "Polygon/0x6e7a5FAFcec6BB1e78bAE2A1F0B612012BF14827" },
  { name: "Quickswap_MATIC_DAI", address: "Polygon/0xEEf611894CeaE652979C9D0DaE1dEb597790C6eE" },
].map(setAddressCategory(AddressCategories.ERC20));

export const addresses = [
  ...govAddresses,
  ...routerAddresses,
  ...marketAddresses,
];
