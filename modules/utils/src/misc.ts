import {
  Asset,
  DateTimeString,
  DecString,
} from "@valuemachine/types";

import { diff, lt } from "./math";

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

export const chrono = (d1: { date: DateTimeString; }, d2: { date: DateTimeString; }): number =>
  new Date(d1.date).getTime() - new Date(d2.date).getTime();
