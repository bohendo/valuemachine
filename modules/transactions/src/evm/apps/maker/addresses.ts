import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { assets, contracts } from "./enums";

const govTokenAddresses = [
  { name: assets.MKR, address: "Ethereum/0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2" },
].map(setAddressCategory(AddressCategories.ERC20));

const proxyAddresses = [
  { name: "OasisProxy", address: "Ethereum/0x793ebbe21607e4f04788f89c7a9b97320773ec59" },
].map(setAddressCategory(AddressCategories.Proxy));

const saiAddresses = [
  { name: contracts.SaiCage, address: "Ethereum/0x9fdc15106da755f9ffd5b0ba9854cfb89602e0fd" },
  { name: contracts.SaiGemPit, address: "Ethereum/0x69076e44a9c70a67d5b79d95795aba299083c275" },
  { name: "SaiTap", address: "Ethereum/0xbda109309f9fafa6dd6a9cb9f1df4085b27ee8ef" },
  { name: contracts.SaiTub, address: "Ethereum/0x448a5065aebb8e423f0896e6c5d525c040f59af3" },
  { name: "SaiVox", address: "Ethereum/0x9b0f70df76165442ca6092939132bbaea77f2d7a" },
].map(setAddressCategory(AddressCategories.Defi));

const daiAddresses = [
  { name: "DaiJoin", address: "Ethereum/0x9759a6ac90977b93b58547b4a71c78317f391a28" },
  { name: "DaiGemJoin", address: "Ethereum/0x2f0b23f53734252bda2277357e97e1517d6b042a" },
  { name: contracts.SaiToDaiVault, address: "Ethereum/0xc73e0383f3aff3215e6f04b0331d58cecf0ab849" },
  { name: contracts.DSR, address: "Ethereum/0x197e90f9fad81970ba7976f33cbd77088e5d7cf7" },
  { name: "DaiSaiJoin", address: "Ethereum/0xad37fd42185ba63009177058208dd1be4b136e6b" },
  { name: contracts.DaiVat, address: "Ethereum/0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b" },
  { name: "DaiManager", address: "Ethereum/0x5ef30b9986345249bc32d8928b7ee64de9435e39" },
].map(setAddressCategory(AddressCategories.Defi));

export const exchangeAddresses = [
  { name: "OasisV1", address: "Ethereum/0x14fbca95be7e99c15cc2996c6c9d841e54b79425" },
  { name: "OasisV2", address: "Ethereum/0xb7ac09c2c0217b07d7c103029b4918a2c401eecb" },
  { name: "Eth2Dai", address: "Ethereum/0x39755357759ce0d7f32dc8dc45414cca409ae24e" },
  { name: "OasisDex", address: "Ethereum/0x794e6e91555438afc3ccf1c5076a74f42133d08d" },
].map(setAddressCategory(AddressCategories.Exchange));

export const tokenAddresses = [
  { name: assets.SAI, address: "Ethereum/0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359" },
  { name: assets.PETH, address: "Ethereum/0xf53ad2c6851052a81b42133467480961b2321c09" },
  { name: assets.DAI, address: "Ethereum/0x6b175474e89094c44da98b954eedeac495271d0f" },
].map(setAddressCategory(AddressCategories.ERC20));

export const factoryAddresses = [
  { name: "MakerProxyRegistry", address: "Ethereum/0x4678f0a6958e4d2bc4f1baf7bc52e8f3564f3fe4" },
  { name: "MakerProxyFactory", address: "Ethereum/0xa26e15c895efc0616177b7c1e7270a4c7d51c997" },
].map(setAddressCategory(AddressCategories.Defi));

export const addresses = [
  ...daiAddresses,
  ...exchangeAddresses,
  ...factoryAddresses,
  ...govTokenAddresses,
  ...proxyAddresses,
  ...saiAddresses,
  ...tokenAddresses,
];

export const saiAddress = addresses.find(e => e.name === assets.SAI)?.address;
export const pethAddress = addresses.find(e => e.name === assets.PETH)?.address;
export const tubAddress = addresses.find(e => e.name === contracts.SaiTub)?.address;
export const cageAddress = addresses.find(e => e.name === contracts.SaiCage)?.address;
export const saiPitAddress = addresses.find(e => e.name === contracts.SaiGemPit)?.address;
export const dsrAddress = addresses.find(e => e.name === contracts.DSR)?.address;
export const vatAddress = addresses.find(e => e.name === contracts.DaiVat)?.address;
export const migrationAddress = addresses.find(e => e.name === contracts.SaiToDaiVault)?.address;
