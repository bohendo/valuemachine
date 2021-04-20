import { AssetTypes } from "./assets";
import { DecimalString, TimestampString } from "./strings";

export type PriceList = {
  [assetType: string]: DecimalString;
};

export type PricesJson = {
  ids: { [assetType: string]: string };
  all: {
    [date: string]: PriceList;
  };
};

export interface Prices {
  getAllPricesOn(date: TimestampString): PriceList;
  getPrice(date: TimestampString, asset: AssetTypes): string | undefined;
  json: PricesJson;
  syncPrice(date: TimestampString, asset: AssetTypes): Promise<string>;
}

export const emptyPrices = { all: {}, ids: {} } as PricesJson;
