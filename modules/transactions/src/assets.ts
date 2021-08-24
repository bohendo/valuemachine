import { Static, Type } from "@sinclair/typebox";

import { assets as aaveAssets } from "./evm/apps/aave/assets";
import { assets as compoundAssets } from "./evm/apps/compound/assets";
import { assets as erc20Assets } from "./evm/apps/erc20/assets";

// Native currency of each standalone blockchain
export const Cryptocurrencies = {
  BCH: "BCH",
  BTC: "BTC",
  ETC: "ETC",
  ETH: "ETH",
  LTC: "LTC",
  MATIC: "MATIC",
} as const;
export const Cryptocurrency = Type.String(); // Extensible
export type Cryptocurrency = Static<typeof Cryptocurrency>;

// Traditional central-bank controlled currencies
export const FiatCurrencies = {
  CZK: "CZK",
  EUR: "EUR",
  GBP: "GBP",
  INR: "INR",
  USD: "USD",
} as const;
export const FiatCurrency = Type.String(); // Extensible
export type FiatCurrency = Static<typeof FiatCurrency>;

export const Assets = {
  ...Cryptocurrencies,
  ...FiatCurrencies,
  ...aaveAssets,
  ...compoundAssets,
  ...erc20Assets,
} as const;
export const Asset = Type.String(); // Extensible
export type Asset = Static<typeof Asset>
