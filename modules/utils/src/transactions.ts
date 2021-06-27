import { Interface } from "@ethersproject/abi";
import { isHexString, hexDataLength } from "@ethersproject/bytes";
import {
  Asset,
  Assets,
  DecimalString,
  EthTransactionLog,
  Transaction,
  TransactionsJson,
  Transfer,
} from "@valuemachine/types";

import { diff, gt, lt } from "./math";
import { getPropertyError } from "./validate";

const { ETH, WETH } = Assets;

export const getEmptyTransactions = (): TransactionsJson => [];

// Smallest difference is first, largest is last
// If diff in 1 is greater than diff in 2, swap them
export const diffAsc = (compareTo: DecimalString) => (t1: Transfer, t2: Transfer): number =>
  gt(
    diff(t1.quantity, compareTo),
    diff(t2.quantity, compareTo),
  ) ? 1 : -1;

export const ETHish = [ETH, WETH] as Asset[];
export const assetsAreClose = (asset1: Asset, asset2: Asset): boolean =>
  asset1 === asset2 || (
    ETHish.includes(asset1) && ETHish.includes(asset2)
  );

// for abbreviating account labels
export const abrv = str => str?.substring(0, 8)?.toLowerCase();

export const rmDups = (array: string[]): string[] =>
  Array.from(new Set([...array]));

export const valuesAreClose = (q1: DecimalString, q2: DecimalString, wiggleRoom = "0.000001") =>
  lt(diff(q1, q2), wiggleRoom);

export const chrono = (e1: Transaction, e2: Transaction): number =>
  new Date(e1.date).getTime() - new Date(e2.date).getTime();

export const parseEvent = (
  iface: Interface,
  ethLog: EthTransactionLog,
): { name: string; args: { [key: string]: string }; } => {
  const name = Object.values(iface.events).find(e =>
    iface.getEventTopic(e) === ethLog.topics[0]
  )?.name;
  const args = name ? iface.parseLog(ethLog).args : [];
  return { name, args };
};

export const isHash = (str: string): boolean => isHexString(str) && hexDataLength(str) === 32;

export const getTransactionsError = (transactions: Transaction[]): string | null => {
  for (const transaction of transactions) {
    for (const { key, expected } of [
      { key: "date", expected: "string" },
      { key: "method", expected: "string?" },
      { key: "hash", expected: "string?" },
      { key: "index", expected: "number?" },
      { key: "sources", expected: "string[]" },
      { key: "transfers", expected: "object[]" },
    ]) {
      const typeError = getPropertyError(transaction, key, expected);
      if (typeError) {
        return typeError;
      }
    }
    for (const transfer of transaction.transfers) {
      for (const { key, expected } of [
        { key: "asset", expected: "string" },
        { key: "category", expected: "string" },
        { key: "from", expected: "string" },
        { key: "index", expected: "number?" },
        { key: "quantity", expected: "string" },
        { key: "to", expected: "string" },
      ]) {
        const typeError = getPropertyError(transfer, key, expected);
        if (typeError) {
          return typeError;
        }
      }
    }
  }
  // Make sure events are in chronological order
  let prevTime = 0;
  for (const transaction of transactions) {
    const currTime = new Date(transaction.date).getTime();
    if (currTime < prevTime) {
      return `Transactions out of order: ${transaction.date} < ${new Date(prevTime).toISOString()}`;
    }
    prevTime = currTime;
  }
  return null;
};
