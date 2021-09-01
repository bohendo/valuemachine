import { Assets } from "./assets";
import { EvmNames } from "./evm/enums";

export const UtxoChains = {
  Bitcoin: "Bitcoin",
  BitcoinCash: "BitcoinCash",
  Litecoin: "Litecoin",
} as const;

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

// Every guard has exactly one special asset that it uses to accept security fees
export const securityFeeAssetMap = {
  [Guards.Bitcoin]: Assets.BTC,
  [Guards.BitcoinCash]: Assets.BCH,
  [Guards.Ethereum]: Assets.ETH,
  [Guards.EthereumClassic]: Assets.ETC,
  [Guards.Litecoin]: Assets.LTC,
  [Guards.Polygon]: Assets.MATIC,
  [Guards.CZE]: Assets.CZK,
  [Guards.EST]: Assets.EUR,
  [Guards.GBR]: Assets.GBP,
  [Guards.IND]: Assets.INR,
  [Guards.ROU]: Assets.EUR,
  [Guards.USA]: Assets.USD,
} as const;
