import { Asset } from "../types";
import { add } from "./math";

// eg [{ amount: "1", type: "ETH"},{ amount: "1", type: "ETH"}] => [{ amount: "2", type: "ETH"}]
export const addAssets = (assets: Asset[]): Asset[] => {
  const total = {};
  for (const asset of assets) {
    if (total[asset.type]) {
      total[asset.type] = add([total[asset.type], asset.amount]);
    } else {
      total[asset.type] = asset.amount;
    }
  }
  return Object.entries(total).map(e => ({ amount: e[1].toString(), type: e[0] }));
};

export const assetsEq = (a1: Asset, a2: Asset): boolean =>
  a1.amount === a2.amount && a1.type == a2.type;

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
