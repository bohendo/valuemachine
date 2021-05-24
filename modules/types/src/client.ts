import { TimestampString } from "./strings";

export type AssetTotal = {
  [asset: string]: [number, number, number];
}

export type TotalByCategoryPerAsset = {
  [category: string]: AssetTotal;
}

export type NetGraphData = {
  lastUpdated: TimestampString;
  netWorth: { [date: string]: AssetTotal };
}

