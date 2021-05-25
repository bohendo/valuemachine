import { Interface } from "@ethersproject/abi";
import { isHexString, hexDataLength } from "@ethersproject/bytes";
import {
  DecimalString,
  EthCall,
  EthTransaction,
  EthTransactionLog,
} from "@finances/types";
import { math } from "@finances/utils";

const { diff, lt } = math;

export const rmDups = (array: string[]): string[] =>
  Array.from(new Set([...array]));

export const quantitiesAreClose = (q1: DecimalString, q2: DecimalString, wiggleRoom = "0.000001") =>
  lt(diff(q1, q2), wiggleRoom);

export const chrono = (e1: EthCall | EthTransaction, e2: EthCall | EthTransaction): number =>
  new Date(e1.timestamp).getTime() - new Date(e2.timestamp).getTime();

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
