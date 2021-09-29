import { Methods as AppMethods } from "./apps/enums";

export { Apps, Methods as AppMethods, Tokens } from "./apps/enums";

export const Methods = {
  ...AppMethods,
  Unknown: "Unknown",
};

export const Evms = {
  Ethereum: "Ethereum",
  EthereumClassic: "EthereumClassic",
  Polygon: "Polygon",
} as const;

export const Assets = {
  ETC: "ETC",
  ETH: "ETH",
  MATIC: "MATIC",
} as const;
