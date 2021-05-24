import { AssetTypes } from "./assets";
import { DecimalString, TimestampString } from "./strings";
import { Transaction } from "./transactions";

export type PriceList = {
  [unit: string]: {
    [assetType: string]: DecimalString; // number of units per asset
  };
};

export type PricesJson = {
  [date: string]: PriceList;
};

export interface Prices {
  json: PricesJson;
  getCount(unit?: AssetTypes, date?: TimestampString): number;
  getPrice(date: TimestampString, asset: AssetTypes, unit?: AssetTypes): string | undefined;
  merge(prices: PricesJson): void;
  syncPrice(
    date: TimestampString,
    asset: AssetTypes,
    unit?: AssetTypes,
  ): Promise<string | undefined>;
  syncTransaction(tx: Transaction, unit?: AssetTypes): Promise<PricesJson>;
}

export const emptyPrices = {} as PricesJson;
