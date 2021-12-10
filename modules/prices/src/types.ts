import { AssetChunk } from "@valuemachine/core";
import { Asset, DateTimeString, DecString } from "@valuemachine/types";
import { Static, Type } from "@sinclair/typebox";
import pino from "pino";

////////////////////////////////////////
// JSON Schema

export const PriceSources = {
  CoinGecko: "CoinGecko",
  UniswapV1: "UniswapV1",
  UniswapV2: "UniswapV2",
  UniswapV3: "UniswapV3",
} as const;
export const PriceSource = Type.Enum(PriceSources);
export type PriceSource = Static<typeof PriceSource>;

export const PriceEntry = Type.Object({
  date: DateTimeString, // TODO: use numbers for quicker comparisons
  unit: Asset,
  asset: Asset,
  price: DecString, // n units per 1 asset
  source: Type.String(), // PriceSource or TxId
});
export type PriceEntry = Static<typeof PriceEntry>;

export const PriceJson = Type.Array(PriceEntry);
export type PriceJson = Static<typeof PriceJson>;

////////////////////////////////////////
// Function Interfaces

export type PricesParams = {
  logger?: pino.Logger;
  json?: PriceJson;
  save?: (pricesJson: PriceJson) => void;
  unit?: Asset;
};

export interface PriceFns {
  getExact: (date: DateTimeString, asset: Asset, unit?: Asset) => DecString | undefined;
  getJson: () => PriceJson;
  getPrice: (date: DateTimeString, asset: Asset, unit?: Asset) => DecString | undefined;
  merge: (prices: PriceJson) => void;
  setPrice: (entry: PriceEntry) => void;
  syncChunks: (chunks: AssetChunk[], unit?: Asset) => Promise<PriceJson>;
  syncPrice: (date: DateTimeString, asset: Asset, unit?: Asset) => Promise<DecString | undefined>;
}
