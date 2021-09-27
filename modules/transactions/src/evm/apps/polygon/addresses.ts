import { AddressCategories } from "@valuemachine/types";
import { setAddressCategory } from "@valuemachine/utils";

import { EvmAssets, EvmNames } from "../../enums";

import { contracts } from "./enums";

const { FlashWallet, PlasmaBridge, PolygonStateSyncer, ZapPolygonBridge } = contracts;

export const govAddresses = [
  {
    address: `${EvmNames.Ethereum}/0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0`,
    name: EvmAssets.MATIC,
  },
].map(setAddressCategory(AddressCategories.ERC20));

export const bridgeAddresses = [
  {
    address: `${EvmNames.Ethereum}/0x401F6c983eA34274ec46f84D70b31C151321188b`,
    name: PlasmaBridge,
  },
  {
    address: `${EvmNames.Ethereum}/0xe34b087bf3c99e664316a15b01e5295eb3512760`,
    name: ZapPolygonBridge,
  },
].map(setAddressCategory(AddressCategories.Defi));

export const miscAddresses = [
  {
    address: `${EvmNames.Ethereum}/0x22F9dCF4647084d6C31b2765F6910cd85C178C18`,
    name: FlashWallet,
  },
  {
    address: `${EvmNames.Ethereum}/0xDef1C0ded9bec7F1a1670819833240f027b25EfF`,
    name: "ZeroEx",
  },
  {
    address: `${EvmNames.Ethereum}/0x28e4F3a7f651294B9564800b2D01f35189A5bFbE`,
    name: "PolygonStateSyncer",
  },
].map(setAddressCategory(AddressCategories.Defi));

export const addresses = [
  ...govAddresses,
  ...bridgeAddresses,
  ...miscAddresses,
];

export const zapBridgeAddress = addresses.find(e => e.name === ZapPolygonBridge)?.address;
export const plasmaBridgeAddress = addresses.find(e => e.name === PlasmaBridge)?.address;
export const flashWalletAddress = addresses.find(e => e.name === FlashWallet)?.address;
export const syncPolygonAddress = addresses.find(e => e.name === PolygonStateSyncer)?.address;
