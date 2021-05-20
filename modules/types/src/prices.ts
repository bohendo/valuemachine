import { AssetTypes } from "./assets";
import { DecimalString, TimestampString } from "./strings";
import { Transaction } from "./transactions";

export type PriceList = {
  [unitOfAccount: string]: {
    [assetType: string]: DecimalString; // number of UoA per asset
  };
};

export type PricesJson = {
  [date: string]: PriceList;
};

export interface Prices {
  json: PricesJson;
  getPrice(date: TimestampString, asset: AssetTypes, uoa?: AssetTypes): string | undefined;
  setPrice(price: DecimalString, date: TimestampString, asset: AssetTypes, uoa?: AssetTypes): void;
  syncPrice(
    date: TimestampString,
    asset: AssetTypes,
    uoa?: AssetTypes,
  ): Promise<string | undefined>;
  syncTransaction(tx: Transaction, uoa?: AssetTypes): Promise<void>;
}

export const emptyPrices = {} as PricesJson;
