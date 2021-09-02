import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { assets, contracts } from "./enums";

const coreAddresses = [
  {
    name: contracts.CompoundV1,
    address: "Ethereum/0x3fda67f7583380e67ef93072294a7fac882fd7e7",
  },
  {
    name: contracts.Maximillion,
    address: "Ethereum/0xf859a1ad94bcf445a406b892ef0d3082f4174088",
  },
  {
    name: contracts.Comptroller,
    address: "Ethereum/0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b",
  },
].map(setAddressCategory(AddressCategories.Defi));

export const cTokenAddresses = [
  {
    address: "Ethereum/0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e",
    decimals: 8,
    name: assets.cBAT,
  },
  {
    address: "Ethereum/0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4",
    decimals: 8,
    name: assets.cCOMP,
  },
  {
    address: "Ethereum/0x5d3a536e4d6dbd6114cc1ead35777bab948e3643",
    decimals: 8,
    name: assets.cDAI,
  },
  {
    address: "Ethereum/0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5",
    decimals: 8,
    name: assets.cETH,
  },
  {
    address: "Ethereum/0x158079ee67fce2f58472a96584a73c7ab9ac95c1",
    decimals: 8,
    name: assets.cREP,
  },
  {
    address: "Ethereum/0xf5dce57282a584d2746faf1593d3121fcac444dc",
    decimals: 8,
    name: assets.cSAI,
  },
  {
    address: "Ethereum/0x35a18000230da775cac24873d00ff85bccded550",
    decimals: 8,
    name: assets.cUNI,
  },
  {
    address: "Ethereum/0x39aa39c021dfbae8fac545936693ac917d5e7563",
    decimals: 8,
    name: assets.cUSDC,
  },
  {
    address: "Ethereum/0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9",
    decimals: 8,
    name: assets.cUSDT,
  },
  {
    address: "Ethereum/0xc11b1268c1a384e55c48c2391d8d480264a3a7f4",
    decimals: 8,
    name: assets.cWBTC,
  },
  {
    address: "Ethereum/0xccf4429db6322d5c611ee964527d42e5d685dd6a",
    decimals: 8,
    name: assets.cWBTCv2,
  },
  {
    address: "Ethereum/0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407",
    decimals: 8,
    name: assets.cZRX,
  },
].map(setAddressCategory(AddressCategories.ERC20));

const govTokenAddresses = [
  {
    name: assets.COMP,
    address: "Ethereum/0xc00e94cb662c3520282e6f5717214004a7f26888",
  },
].map(setAddressCategory(AddressCategories.ERC20));

export const addresses = [
  ...cTokenAddresses,
  ...govTokenAddresses,
  ...coreAddresses,
];

export const maximillionAddress = addresses.find(e => e.name === contracts.Maximillion).address;
export const comptrollerAddress = addresses.find(e => e.name === contracts.Comptroller).address;
export const compoundV1Address = addresses.find(e => e.name === contracts.CompoundV1).address;
export const compAddress = addresses.find(e => e.name === assets.COMP).address;
