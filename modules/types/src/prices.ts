import { Static, Type } from "@sinclair/typebox";

import { Logger } from "./logger";
import { Store } from "./store";
import { Asset, DateString, DecString, DateTimeString } from "./strings";
import { AssetChunk } from "./vm";

////////////////////////////////////////
// JSON Schema

// unit:asset:price where price is the number of units per asset
export const PriceList = Type.Record(Type.String(), Type.Record(Type.String(), DecString));
export type PriceList = Static<typeof PriceList>;

// date:PriceList
export const PricesJson = Type.Record(Type.String(), PriceList);
export type PricesJson = Static<typeof PricesJson>;

////////////////////////////////////////
// Function Interfaces

export type PricesParams = {
  logger?: Logger;
  json?: PricesJson;
  store?: Store;
  unit?: Asset;
};

export interface Prices {
  getPrice: (date: DateTimeString, asset: Asset, unit?: Asset) => string | undefined;
  getNearest: (date: DateTimeString, asset: Asset, unit?: Asset) => string | undefined;
  setPrice: (price: DecString, rawDate: DateString, asset: Asset, givenUnit?: Asset) => void;
  json: PricesJson;
  merge: (prices: PricesJson) => void;
  syncChunks: (chunks: AssetChunk[], unit?: Asset) => Promise<PricesJson>;
  syncPrice: (date: DateTimeString, asset: Asset, unit?: Asset) => Promise<string | undefined>;
}
