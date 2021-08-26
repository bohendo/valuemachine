import { Static, Type } from "@sinclair/typebox";

// Security providers on the internet aka blockchains
export const DigitalGuards = {
  Bitcoin: "Bitcoin",
  BitcoinCash: "BitcoinCash",
  Ethereum: "Ethereum",
  EthereumClassic: "EthereumClassic",
  Litecoin: "Litecoin",
  Polygon: "Polygon",
} as const;
export const DigitalGuard = Type.String(); // Extensible
export type DigitalGuard = Static<typeof DigitalGuard>;

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
export const PhysicalGuard = Type.String(); // Extensible
export type PhysicalGuard = Static<typeof PhysicalGuard>;

export const Guards = {
  ...DigitalGuards,
  ...PhysicalGuards,
  None: "None",
} as const;
export const Guard = Type.String(); // Extensible
export type Guard = Static<typeof Guard>;

/*
// Every guard has exactly one special asset that it uses to accept security fees
export const SecurityFeeAssets = {
  [DigitalGuards.Bitcoin]: Cryptocurrencies.BTC,
  [DigitalGuards.BitcoinCash]: Cryptocurrencies.BCH,
  [DigitalGuards.Ethereum]: Cryptocurrencies.ETH,
  [DigitalGuards.EthereumClassic]: Cryptocurrencies.ETC,
  [DigitalGuards.Litecoin]: Cryptocurrencies.LTC,
  [DigitalGuards.Polygon]: Cryptocurrencies.MATIC,
  [PhysicalGuards.CZE]: FiatCurrencies.CZK,
  [PhysicalGuards.EST]: FiatCurrencies.EUR,
  [PhysicalGuards.GBR]: FiatCurrencies.GBP,
  [PhysicalGuards.IND]: FiatCurrencies.INR,
  [PhysicalGuards.ROU]: FiatCurrencies.EUR,
  [PhysicalGuards.USA]: FiatCurrencies.USD,
} as const;
*/
