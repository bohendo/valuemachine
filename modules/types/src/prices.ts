import { AssetTypes } from "./assets";
import { DecimalString, TimestampString } from "./strings";

export type PricesJson = {
  ids: { [assetType: string]: string };
  [date: string]: {
    [assetType: string]: DecimalString;
  };
}

export interface Prices {
  getPrice(asset: AssetTypes, date: TimestampString): Promise<string>;
  json: PricesJson;
}

export const emptyPrices = { ids: {} } as PricesJson;
