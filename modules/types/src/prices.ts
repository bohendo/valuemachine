import { Assets } from "./assets";
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
  getCount(unit?: Assets, date?: TimestampString): number;
  getPrice(date: TimestampString, asset: Assets, unit?: Assets): string | undefined;
  merge(prices: PricesJson): void;
  syncPrice(
    date: TimestampString,
    asset: Assets,
    unit?: Assets,
  ): Promise<string | undefined>;
  syncTransaction(tx: Transaction, unit?: Assets): Promise<PricesJson>;
}

export const emptyPrices = {} as PricesJson;
