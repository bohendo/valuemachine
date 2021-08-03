import { Static, Type } from "@sinclair/typebox";

import { EvmNames } from "./evmData";
import { FiatCurrencies, Cryptocurrencies } from "./assets";

export const Evms = {
  Ethereum: "Ethereum",
  EthereumClassic: "EthereumClassic",
  Polygon: "Polygon",
} as const;
export const Evm = Type.Enum(Evms);
export type Evm = Static<typeof Evm>;

export const EvmIdMapping = {
  Ethereum: 1,
  EthereumClassic: 6,
  Polygon: 137,
} as const;

export const Utxos = {
  Bitcoin: "Bitcoin",
  BitcoinCash: "BitcoinCash",
  Litecoin: "Litecoin",
} as const;
export const Utxo = Type.Enum(Utxos);
export type Utxo = Static<typeof Utxo>;

// https://en.bitcoin.it/wiki/BIP_0122
export const UtxoIdMapping = {
  Bitcoin: "000000000019d6689c085ae165831e93",
  BitcoinCash: "000000000000000000651ef99cb9fcbe",
  Litecoin: "12a765e31ffd4059bada1e25190f6e98",
} as const;

// Security providers on the internet aka blockchains
export const DigitalGuards = {
  ...EvmNames,
  ...Utxos,
} as const;
export const DigitalGuard = Type.Enum(DigitalGuards);
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
export const PhysicalGuard = Type.Enum(PhysicalGuards);
export type PhysicalGuard = Static<typeof PhysicalGuard>;

export const Guards = {
  ...DigitalGuards,
  ...PhysicalGuards,
  None: "None",
} as const;
export const Guard = Type.Union([
  Type.Enum(Guards),
  Type.String(), // allow arbitrary guards in app-level code
]);
export type Guard = Static<typeof Guard>;

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
