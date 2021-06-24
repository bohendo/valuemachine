import { Asset } from "./assets";
import { Logger } from "./logger";
import { Store } from "./store";
import { DecimalString, TimestampString } from "./strings";
import { Transaction } from "./transactions";
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
  json: PricesJson;
  getCount(unit?: Asset, date?: TimestampString): number;
  getPrice(date: TimestampString, asset: Asset, unit?: Asset): string | undefined;
  setPrice(
    price: DecimalString,
    date: TimestampString,
    asset: Asset,
    unit?: Asset
  ): void;
  merge(prices: PricesJson): void;
  syncPrice(
    date: TimestampString,
    asset: Asset,
    unit?: Asset,
  ): Promise<string | undefined>;
  syncTransaction(tx: Transaction, unit?: Asset): Promise<PricesJson>;
  syncChunks(chunks: AssetChunk[]): Promise<PricesJson>;
}

export const emptyPrices = {} as PricesJson;
