import { Static, Type } from "@sinclair/typebox";

import { EvmAssets } from "./evm/enums";

// Native currency of each standalone blockchain
export const Cryptocurrencies = {
  ...EvmAssets,
  BCH: "BCH",
  BTC: "BTC",
  LTC: "LTC",
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
} as const;
export const Asset = Type.String(); // Extensible
export type Asset = Static<typeof Asset>
