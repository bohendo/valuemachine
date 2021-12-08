import { AssetChunk } from "@valuemachine/core";
import { Asset, DateString, DecString, DateTimeString } from "@valuemachine/types";
import { Static, Type } from "@sinclair/typebox";
import pino from "pino";

////////////////////////////////////////
// JSON Schema

// unit:asset:price where price is the number of units per asset
export const PriceList = Type.Record(Type.String(), Type.Record(Type.String(), DecString));
export type PriceList = Static<typeof PriceList>;

// date:PriceList
export const PriceJson = Type.Record(Type.String(), PriceList);
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
  setPrice: (price: DecString, rawDate: DateString, asset: Asset, givenUnit?: Asset) => void;
  json: PriceJson;
  merge: (prices: PriceJson) => void;
  syncChunks: (chunks: AssetChunk[], unit?: Asset) => Promise<PriceJson>;
  syncPrice: (date: DateTimeString, asset: Asset, unit?: Asset) => Promise<string | undefined>;
}
