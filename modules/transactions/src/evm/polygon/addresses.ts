import { AddressZero } from "@ethersproject/constants";
import { AddressCategories } from "@valuemachine/types";
import { setAddressCategory } from "@valuemachine/utils";

const burnAddresses = [
  { name: "void", address: `evm:137:${AddressZero}` },
].map(setAddressCategory(AddressCategories.Burn));

const defiAddresses = [
  { name: "ChildChain", address: "evm:137:0xD9c7C4ED4B66858301D0cb28Cc88bf655Fe34861" },
].map(setAddressCategory(AddressCategories.Defi));

export const publicPolygonAddresses = [
  ...burnAddresses,
  ...defiAddresses,
];

