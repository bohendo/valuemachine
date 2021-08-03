import {
  Asset,
  DecimalString,
  Transaction,
  TransactionsJson,
} from "@valuemachine/types";

import { diff, lt } from "./math";
import { ajv, formatErrors } from "./validate";

export const getEmptyTransactions = (): TransactionsJson => [];

const validateTransactions = ajv.compile(TransactionsJson);
export const getTransactionsError = (transactionsJson: TransactionsJson): string | null =>
  validateTransactions(transactionsJson)
    ? null
    : validateTransactions.errors.length ? formatErrors(validateTransactions.errors)
    : `Invalid Transactions`;

export const dedup = <T>(array: T[]): T[] =>
  Array.from(new Set([...array]));

// Ignores "W" prefix so that wrapped assets (eg WETH) are close to the underlying (eg ETH)
export const assetsAreClose = (asset1: Asset, asset2: Asset): boolean =>
  asset1 === asset2 || (
    asset1.startsWith("W") && asset1.substring(1) === asset2
  ) || (
    asset2.startsWith("W") && asset2.substring(1) === asset1
  );

export const valuesAreClose = (q1: DecimalString, q2: DecimalString, wiggleRoom = "0.000001") =>
  lt(diff(q1, q2), wiggleRoom);

export const chrono = (e1: Transaction, e2: Transaction): number =>
  new Date(e1.date).getTime() - new Date(e2.date).getTime();
