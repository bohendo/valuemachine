import { Asset } from "./assets";
import { Logger } from "./logger";
import { Store } from "./store";
import { DecimalString, TimestampString } from "./strings";
import { AssetChunk } from "./vm";

export type PriceList = {
  [unit: string]: {
    [asset: string]: DecimalString; // number of units per asset
  };
};

export type PricesJson = {
  [date: string]: PriceList;
};

export type PricesParams = {
  logger?: Logger;
  json?: PricesJson;
  store?: Store;
  unit?: Asset;
};

export interface Prices {
  getPrice(date: TimestampString, asset: Asset, unit?: Asset): string | undefined;
  json: PricesJson;
  merge(prices: PricesJson): void;
  syncChunks(chunks: AssetChunk[], unit?: Asset): Promise<PricesJson>;
  syncPrice(date: TimestampString, asset: Asset, unit?: Asset): Promise<string | undefined>;
}

export const emptyPrices = {} as PricesJson;
