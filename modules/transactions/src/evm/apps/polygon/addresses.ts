import { AddressCategories } from "@valuemachine/types";
import { setAddressCategory } from "@valuemachine/utils";

import { Apps, Tokens, Evms } from "../../enums";

export const govAddresses = [
  {
    address: `${Evms.Ethereum}/0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0`,
    name: Tokens.MATIC,
  },
].map(setAddressCategory(AddressCategories.ERC20));

export const bridgeAddresses = [
  {
    address: `${Evms.Ethereum}/0x401F6c983eA34274ec46f84D70b31C151321188b`,
    name: Apps.PlasmaBridge,
  },
  {
    address: `${Evms.Ethereum}/0xe34b087bf3c99e664316a15b01e5295eb3512760`,
    name: Apps.ZapPolygonBridge,
  },
].map(setAddressCategory(AddressCategories.Defi));

export const miscAddresses = [
  {
    address: `${Evms.Ethereum}/0x22F9dCF4647084d6C31b2765F6910cd85C178C18`,
    name: Apps.FlashWallet,
  },
  {
    address: `${Evms.Ethereum}/0xDef1C0ded9bec7F1a1670819833240f027b25EfF`,
    name: "ZeroEx",
  },
  {
    address: `${Evms.Ethereum}/0x28e4F3a7f651294B9564800b2D01f35189A5bFbE`,
    name: Apps.PolygonStateSyncer,
  },
].map(setAddressCategory(AddressCategories.Defi));

export const addresses = [
  ...govAddresses,
  ...bridgeAddresses,
  ...miscAddresses,
];

export const zapBridgeAddress = addresses.find(e => e.name === Apps.ZapPolygonBridge)?.address;
export const plasmaBridgeAddress = addresses.find(e => e.name === Apps.PlasmaBridge)?.address;
export const flashWalletAddress = addresses.find(e => e.name === Apps.FlashWallet)?.address;
export const syncPolygonAddress = addresses.find(e => e.name === Apps.PolygonStateSyncer)?.address;
