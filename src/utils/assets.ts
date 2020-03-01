import { AssetType, DecimalString } from "../types";
import { add } from "./math";

type Asset = { assetType: AssetType; quantity: DecimalString };

// eg [{ quantity: "1", assetType: "ETH"},{ quantity: "1", assetType: "ETH"}] =>
//      [{ quantity: "2", assetType: "ETH"}]
export const addAssets = (assets: Asset[]): Asset[] => {
  const total = {};
  for (const asset of assets) {
    if (total[asset.assetType]) {
      total[asset.assetType] = add([total[asset.assetType], asset.quantity]);
    } else {
      total[asset.assetType] = asset.quantity;
    }
  }
  return Object.entries(total).map(e => ({ assetType: e[0], quantity: e[1].toString() }));
};

export const assetsEq = (a1: Asset, a2: Asset): boolean =>
  a1.quantity === a2.quantity && a1.assetType == a2.assetType;

export const assetListsEq = (loa1: Asset[], loa2: Asset[]): boolean => {
  const sum1 = addAssets(loa1);
  const sum2 = addAssets(loa2);
  for (const a1 of sum1) {
    if (!sum2.find(a => assetsEq(a, a1))) { return false; }
  }
  for (const a2 of sum2) {
    if (!sum1.find(a => assetsEq(a, a2))) { return false; }
  }
  return true;
};
