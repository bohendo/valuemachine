import { Interface } from "@ethersproject/abi";
import { isHexString, hexDataLength } from "@ethersproject/bytes";
import {
  Assets,
  Asset,
  DecimalString,
  EthTransactionLog,
  Transaction,
  Transfer,
} from "@valuemachine/types";

import { diff, gt, lt } from "./math";

const { ETH, WETH } = Assets;

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
