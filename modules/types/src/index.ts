// Data type to be consumed by React-app

export type AssetTotal = {
  [assetType: string]: [number, number, number];
}

export type TotalByCategoryPerAssetType = {
  [category: string]: AssetTotal;
}
export type NetWorth = {
  [date: string]: AssetTotal;
}

export type NetGraphData = {
  lastUpdated: TimestampString;
  netWorth: NetWorth;
}

export type PriceData = {
  ids: { [assetType: string]: string };
  [date: string]: {
    [assetType: string]: DecimalString;
  };
}
