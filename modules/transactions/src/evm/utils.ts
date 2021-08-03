import { Interface } from "@ethersproject/abi";
import {
  DecimalString,
  EvmTransactionLog,
  Transfer,
} from "@valuemachine/types";
import { diff, gt } from "@valuemachine/utils";

// Smallest difference is first, largest is last
// If diff in 1 is greater than diff in 2, swap them
export const diffAsc = (compareTo: DecimalString) => (t1: Transfer, t2: Transfer): number =>
  gt(
    diff(t1.quantity, compareTo),
    diff(t2.quantity, compareTo),
  ) ? 1 : -1;

export const parseEvent = (
  abi: any,
  ethLog: EvmTransactionLog,
): { name: string; args: { [key: string]: string }; } => {
  const iface = abi.length ? new Interface(abi) : abi as Interface;
  const name = Object.values(iface.events).find(e =>
    iface.getEventTopic(e) === ethLog.topics[0]
  )?.name;
  const args = name ? iface.parseLog(ethLog).args : [];
  return { name, args };
};
