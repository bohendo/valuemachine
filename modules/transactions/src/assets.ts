import { EvmAssets } from "./evm/enums";

export { EvmAssets } from "./evm/enums";

// Native currency of each standalone blockchain
export const Cryptocurrencies = {
  ...EvmAssets,
  BCH: "BCH",
  BTC: "BTC",
  LTC: "LTC",
} as const;

// Traditional central-bank controlled currencies
export const FiatCurrencies = {
  CZK: "CZK",
  EUR: "EUR",
  GBP: "GBP",
  INR: "INR",
  USD: "USD",
} as const;

export const Assets = {
  ...Cryptocurrencies,
  ...FiatCurrencies,
} as const;
