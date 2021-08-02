import { AddressZero } from "@ethersproject/constants";
import { Guards, AddressCategories } from "@valuemachine/types";
import { setAddressCategory } from "@valuemachine/utils";

const burnAddresses = [
  { name: "void", address: AddressZero },
].map(setAddressCategory(AddressCategories.Burn, Guards.Polygon));

const defiAddresses = [
  { name: "ChildChain", address: "evm:137:0xD9c7C4ED4B66858301D0cb28Cc88bf655Fe34861" },
].map(setAddressCategory(AddressCategories.Defi, Guards.Polygon));

export const publicPolygonAddresses = [
  ...burnAddresses,
  ...defiAddresses,
];

