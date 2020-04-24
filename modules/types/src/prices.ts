import { DecimalString } from "./strings";

export type PriceData = {
  ids: { [assetType: string]: string };
  [date: string]: {
    [assetType: string]: DecimalString;
  };
}

export const emptyPriceData = { ids: {} } as PriceData;
