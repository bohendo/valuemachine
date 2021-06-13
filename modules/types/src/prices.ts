import { Asset } from "./assets";
import { DecimalString, TimestampString } from "./strings";
import { Transaction } from "./transactions";

export type PriceList = {
  [unit: string]: {
    [asset: string]: DecimalString; // number of units per asset
  };
};

export type PricesJson = {
  [date: string]: PriceList;
};

export interface Prices {
  json: PricesJson;
  getCount(unit?: Asset, date?: TimestampString): number;
  getPrice(date: TimestampString, asset: Asset, unit?: Asset): string | undefined;
  merge(prices: PricesJson): void;
  syncPrice(
    date: TimestampString,
    asset: Asset,
    unit?: Asset,
  ): Promise<string | undefined>;
  syncTransaction(tx: Transaction, unit?: Asset): Promise<PricesJson>;
}

export const emptyPrices = {} as PricesJson;
