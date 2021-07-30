import {
  AddressCategories,
  Assets,
} from "@valuemachine/types";

import { setAddressCategory } from "./utils";

const { AAVE, amAAVE, amDAI, amUSDC, amWBTC, amWETH, amUSDT, amMATIC } = Assets;

const govAddresses = [
  { name: AAVE, address: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B" },
].map(setAddressCategory(AddressCategories.ERC20));

const coreAddresses = [
  { name: "LendingPool", address: "0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf" },
].map(setAddressCategory(AddressCategories.Defi));

// https://docs.aave.com/developers/deployed-contracts/deployed-contracts
const marketAddresses = [
  { name: amAAVE, address: "0x1d2a0E5EC8E5bBDCA5CB219e649B565d8e5c3360" },
  { name: amDAI, address: "0x27F8D03b3a2196956ED754baDc28D73be8830A6e" },
  { name: amUSDC, address: "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F" },
  { name: amUSDT, address: "0x60D55F02A771d515e077c9C2403a1ef324885CeC" },
  { name: amWETH, address: "0x28424507fefb6f7f8E9D3860F56504E4e5f5f390" },
  { name: amWBTC, address: "0x5c2ed810328349100A66B82b78a1791B101C9D61" },
  { name: amMATIC, address: "0x8dF3aad3a84da6b69A4DA8aeC3eA40d9091B2Ac4" },
].map(setAddressCategory(AddressCategories.ERC20));

export const aaveAddresses = [
  ...govAddresses,
  ...coreAddresses,
  ...marketAddresses,
];

// I think we can use the ethereum aave parser on polygon too.. If we can get the accounts right
