import { /*defaultAbiCoder, AbiCoder,*/ Interface } from "@ethersproject/abi";
import {
  DecimalString,
  EvmTransactionLog,
  EvmMetadata,
  Transfer,
} from "@valuemachine/types";
import { diff, gt } from "@valuemachine/utils";

export const getAppAccount = (address: string, app: string): string => {
  if (!address || !app) return "";
  const [chainType, chainId, simpleAddress] = address.split(":");
  return `${chainType}:${chainId}/${app}:${simpleAddress}`;
};

// Smallest difference is first, largest is last
// If diff in 1 is greater than diff in 2, swap them
export const diffAsc = (compareTo: DecimalString) => (t1: Transfer, t2: Transfer): number =>
  gt(
    diff(t1.quantity, compareTo),
    diff(t2.quantity, compareTo),
  ) ? 1 : -1;

// TODO: clean up if/when I get feedback on https://github.com/ethers-io/ethers.js/issues/1831
export const parseEvent = (
  abi: any,
  evmLog: EvmTransactionLog,
  evmMeta: EvmMetadata,
): { name: string; args: { [key: string]: string }; } => {
  const iface = abi.length ? new Interface(abi) : abi as Interface;
  const name = Object.values(iface.events).find(e =>
    iface.getEventTopic(e) === evmLog.topics[0]
  )?.name;
  const formatAddress = (address: string): string => `${evmMeta.name}/${address}`;
  const rawArgs = name ? iface.parseLog({
    data: evmLog.data,
    topics: evmLog.topics,
  }).args : [];
  /*
  const coder = new AbiCoder((type: string, value: any) => {
    if (type === "address") {
      return formatAddress(value);
    } else {
      return value;
    }
  });
  */
  const args = rawArgs.map(arg => arg.lenght === 42 ? formatAddress(arg) : arg) as any;
  Object.keys(rawArgs).forEach(key => {
    if ((key as any) % 1 === 0) return;
    args[key] = rawArgs[key].length === 42 ? formatAddress(rawArgs[key]) : rawArgs[key];
  });
  return { name, args };
};
