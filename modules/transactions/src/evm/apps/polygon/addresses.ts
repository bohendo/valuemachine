import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { EvmAssets } from "../../enums";

const ZapperPolygonBridge = "ZapperPolygonBridge";
const PlasmaBridge = "PlasmaBridge";

export const govAddresses = [
  { name: EvmAssets.MATIC, address: "Ethereum/0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0" },
].map(setAddressCategory(AddressCategories.ERC20));

export const bridgeAddresses = [
  { name: PlasmaBridge, address: "Ethereum/0x401F6c983eA34274ec46f84D70b31C151321188b" },
  { name: ZapperPolygonBridge, address: "Ethereum/0xe34b087bf3c99e664316a15b01e5295eb3512760" },
].map(setAddressCategory(AddressCategories.Defi));

export const miscAddresses = [
  { name: "FlashWallet", address: "Ethereum/0x22F9dCF4647084d6C31b2765F6910cd85C178C18" },
  { name: "ZeroEx", address: "Ethereum/0xDef1C0ded9bec7F1a1670819833240f027b25EfF" },
  { name: "PolygonStateSyncer", address: "Ethereum/0x28e4F3a7f651294B9564800b2D01f35189A5bFbE" },
].map(setAddressCategory(AddressCategories.Defi));

export const addresses = [
  ...govAddresses,
  ...bridgeAddresses,
  ...miscAddresses,
];
