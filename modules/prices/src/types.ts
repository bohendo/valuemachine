import { ValueMachine } from "@valuemachine/core";
import { Asset, DateTimeString } from "@valuemachine/types";
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
  time: Type.Number(), // ms since epoch
  unit: Asset,
  asset: Asset,
  price: Type.Number(), // n units per 1 asset
  source: Type.String(), // PriceSource or TxId
});
export type PriceEntry = Static<typeof PriceEntry>;

export const PriceJson = Type.Array(PriceEntry);
export type PriceJson = Static<typeof PriceJson>;

// eg { DAI: ["2020-01-01T00:00:00Z", "2020-01-01T12:00:00Z"], ETH: ["2020-01-01T00:00:00Z"] }
export const MissingPrices = Type.Record(Type.String(), Type.Array(DateTimeString));
export type MissingPrices = Static<typeof MissingPrices>;

////////////////////////////////////////
// Function Interfaces

export type PricesParams = {
  logger?: pino.Logger;
  json?: PriceJson;
  save?: (pricesJson: PriceJson) => void;
  unit?: Asset;
};

export interface PriceFns {
  calcPrices: (vm: ValueMachine) => PriceJson;
  fetchPrices: (missingPrices: MissingPrices, unit?: Asset) => Promise<PriceJson>;
  getJson: () => PriceJson;
  getMissing: (vm: ValueMachine, unit?: Asset) => MissingPrices;
  getPrice: (time: DateTimeString | number, asset: Asset, unit?: Asset) => number | undefined;
  merge: (prices: PriceJson) => void;
}

////////////////////////////////////////
// Path

export type Step = {
  asset: Asset;
  prices: PriceJson; // empty for first step
};

export type Path = Array<Step>;
