import { Tokens } from "./apps/enums";

export { EvmApps } from "./apps/enums";

export const EvmNames = {
  Ethereum: "Ethereum",
  EthereumClassic: "EthereumClassic",
  Polygon: "Polygon",
};

export const EvmAssets = {
  ...Tokens,
  ETC: "ETC",
  ETH: "ETH",
  MATIC: "MATIC",
} as const;

export const enums = { EvmNames, EvmAssets };
