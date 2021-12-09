import {
  Asset,
  Balances,
  Value,
  DateTimeString,
  DecString,
} from "@valuemachine/types";

import { add, eq, gt, round, sub, diff, lt } from "./math";

export const dedup = <T>(array: T[]): T[] =>
  Array.from(new Set([...array]));

// Ignores "W" prefix so that wrapped assets (eg WETH) are close to the underlying (eg ETH)
export const assetsAreClose = (asset1: Asset, asset2: Asset): boolean =>
  asset1 === asset2 || (
    asset1.startsWith("W") && asset1.substring(1) === asset2
  ) || (
    asset2.startsWith("W") && asset2.substring(1) === asset1
  );

export const valuesAreClose = (q1: DecString, q2: DecString, wiggleRoom = "0.000001") =>
  lt(diff(q1, q2), wiggleRoom);

export const sumValue = (values: Array<Value>): Balances => {
  const result = values.reduce((total, value) => {
    if (!value.amount) {
      return { ...total, [value.asset]: "1" }; // Treat NFTs as always having an amount of 1
    } else if (value.amount !== "ALL" && !eq(value.amount, "0")) {
      return { ...total, [value.asset]: add(total[value.asset], value.amount) };
    } else {
      return total;
    }
  }, {} as Balances);
  // Clean up result of any positive & negative chunks that perfectly cancelled out
  for (const asset of Object.keys(result)) {
    if (eq(result[asset], "0")) {
      delete result[asset];
    }
  }
  return result;
};

// annihilate values that are present in both balances
export const diffBalances = (balancesList: Balances[]): Balances[] => {
  if (balancesList.length !== 2) return balancesList; // we can only diff 2 balances
  const output = [{ ...balancesList[0] }, { ...balancesList[1] }];
  for (const asset of Object.keys(output[0])) {
    if (asset in output[0] && asset in output[1]) {
      if (gt(output[0][asset], output[1][asset])) {
        output[0][asset] = sub(output[0][asset], output[1][asset]);
        delete output[1][asset];
      } else {
        output[1][asset] = sub(output[1][asset], output[0][asset]);
        delete output[0][asset];
        if (eq(output[1][asset], "0")) {
          delete output[1][asset];
        }
      }
    }
  }
  return output;
};

export const describeBalance = (balance: Balances): string =>
  Object.keys(balance).map(asset =>
    eq(balance[asset], "1") && asset.includes("_")
      ? asset
      : `${round(balance[asset])} ${asset}`
  ).join(" and ");
