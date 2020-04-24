import { TimestampString } from "./strings";

export type AssetTotal = {
  [assetType: string]: [number, number, number];
}

export type TotalByCategoryPerAssetType = {
  [category: string]: AssetTotal;
}

export type NetGraphData = {
  lastUpdated: TimestampString;
  netWorth: { [date: string]: AssetTotal };
}

