import {
  CsvSources,
  CsvMethods,
} from "./csv/enums";
import {
  Apps as EvmApps,
  Methods as EvmMethods,
  Assets as EvmAssets,
  Tokens as EvmTokens,
  Evms as EvmNames,
} from "./evm/enums";

export { CsvSources } from "./csv/enums";
export {
  Apps as EvmApps,
  Methods as EvmMethods,
  Assets as EvmAssets,
  Tokens as EvmTokens,
  Evms as EvmNames,
} from "./evm/enums";

////////////////////////////////////////
// Utxo stuff

export const UtxoChains = {
  Bitcoin: "Bitcoin",
  BitcoinCash: "BitcoinCash",
  Litecoin: "Litecoin",
} as const;

export const UtxoAssets = {
  BCH: "BCH",
  BTC: "BTC",
  LTC: "LTC",
} as const;

////////////////////////////////////////
// Apps

export const Apps = {
  ...EvmApps,
} as const;

////////////////////////////////////////
// Methods

export const Methods = {
  ...CsvMethods,
  ...EvmMethods,
} as const;

////////////////////////////////////////
// Assets

export const Cryptocurrencies = {
  ...EvmAssets,
  ...EvmTokens,
  ...UtxoAssets,
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

////////////////////////////////////////
// Sources

export const TransactionSources = {
  ...CsvSources,
  ...EvmNames,
  ...UtxoChains,
} as const;

////////////////////////////////////////
// Guards

// Security providers on the internet aka blockchains
export const DigitalGuards = {
  ...EvmNames,
  ...UtxoChains,
} as const;

// Security providers in the physical world aka countries
// https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3
export const PhysicalGuards = {
  CZE: "CZE",
  EST: "EST",
  GBR: "GBR",
  IND: "IND",
  ROU: "ROU",
  USA: "USA",
} as const;

export const Guards = {
  ...DigitalGuards,
  ...PhysicalGuards,
  None: "None",
} as const;
