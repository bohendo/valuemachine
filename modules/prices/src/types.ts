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
  date: DateTimeString,
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
  getPrice: (date: DateTimeString, asset: Asset, unit?: Asset) => string | undefined;
  getNearest: (date: DateTimeString, asset: Asset, unit?: Asset) => string | undefined;
  setPrice: (entry: PriceEntry) => void;
  getJson: () => PriceJson;
  merge: (prices: PriceJson) => void;
  syncChunks: (chunks: AssetChunk[], unit?: Asset) => Promise<PriceJson>;
  syncPrice: (date: DateTimeString, asset: Asset, unit?: Asset) => Promise<string | undefined>;
}
