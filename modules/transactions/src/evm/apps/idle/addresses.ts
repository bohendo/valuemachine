import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { assets } from "./assets";

export const coreAddresses = [
  { name: "stkIDLE", address: "Ethereum/0xaAC13a116eA7016689993193FcE4BadC8038136f" },
].map(setAddressCategory(AddressCategories.Defi));

export const govAddresses = [
  { name: assets.IDLE, address: "Ethereum/0x875773784Af8135eA0ef43b5a374AaD105c5D39e" },
].map(setAddressCategory(AddressCategories.ERC20));

export const marketAddresses = [
  { name: assets.idleDAIYield, address: "Ethereum/0x3fe7940616e5bc47b0775a0dccf6237893353bb4" },
  { name: assets.idleRAIYield, address: "Ethereum/0x5C960a3DCC01BE8a0f49c02A8ceBCAcf5D07fABe" },
  { name: assets.idleSUSDYield, address: "Ethereum/0xF52CDcD458bf455aeD77751743180eC4A595Fd3F" },
  { name: assets.idleTUSDYield, address: "Ethereum/0xc278041fDD8249FE4c1Aad1193876857EEa3D68c" },
  { name: assets.idleUSDCYield, address: "Ethereum/0x5274891bEC421B39D23760c04A6755eCB444797C" },
  { name: assets.idleUSDTYield, address: "Ethereum/0xF34842d05A1c888Ca02769A633DF37177415C2f8" },
  { name: assets.idleWBTCYield, address: "Ethereum/0x8C81121B15197fA0eEaEE1DC75533419DcfD3151" },
  { name: assets.idleWETHYield, address: "Ethereum/0xC8E6CA6E96a326dC448307A5fDE90a0b21fd7f80" },
  { name: assets.idleDAISafe, address: "Ethereum/0xa14ea0e11121e6e951e87c66afe460a00bcd6a16" },
  { name: assets.idleUSDCSafe, address: "Ethereum/0x3391bc034f2935eF0E1e41619445F998b2680D35" },
  { name: assets.idleUSDTSafe, address: "Ethereum/0x28fAc5334C9f7262b3A3Fe707e250E01053e07b5" },
].map(setAddressCategory(AddressCategories.ERC20));

export const addresses = [
  ...coreAddresses,
  ...govAddresses,
  ...marketAddresses,
];
