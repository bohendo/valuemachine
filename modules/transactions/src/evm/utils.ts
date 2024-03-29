import { Interface } from "@ethersproject/abi";
import { getAddress as getEvmAddress } from "@ethersproject/address";
import { hexlify, isHexString } from "@ethersproject/bytes";
import { AddressZero } from "@ethersproject/constants";
import { keccak256 } from "@ethersproject/keccak256";
import { encode } from "@ethersproject/rlp";
import { formatEther } from "@ethersproject/units";
import { Account, DecString } from "@valuemachine/types";
import { ajv, formatErrors, math } from "@valuemachine/utils";

import { AddressCategories, Guards, TransferCategories } from "../enums";
import { AddressBook, Transfer, TransferCategory } from "../types";

import {
  EvmAddress,
  EvmDataJson,
  EvmMetadata,
  EvmTransaction,
  EvmTransactionLog,
  EvmTransfer,
} from "./types";

export { sumTransfers } from "../utils";

export const getEmptyEvmData = (): EvmDataJson => ({
  addresses: {},
  transactions: {},
});

export const getNewContractAddress = (from: EvmAddress, nonce: number): EvmAddress => `0x${
  keccak256(encode([from.split("/").pop(), hexlify(nonce)])).substring(26).toLowerCase()
}`;

const validateEvmData = ajv.compile(EvmDataJson);
export const getEvmDataError = (evmDataJson: EvmDataJson): string =>
  validateEvmData(evmDataJson)
    ? ""
    : validateEvmData.errors.length ? formatErrors(validateEvmData.errors)
    : `Invalid EvmData: ${JSON.stringify(evmDataJson)}`;

const validateEvmTransaction = ajv.compile(EvmTransaction);
export const getEvmTransactionError = (ethTx: EvmTransaction): string =>
  validateEvmTransaction(ethTx)
    ? ""
    : validateEvmTransaction.errors.length ? formatErrors(validateEvmTransaction.errors)
    : `Invalid EvmTransaction: ${JSON.stringify(ethTx)}`;

export const describeAbi = (abi: any) => {
  const iface = new Interface(abi);
  return [
    ...Object.values(iface.events).map(evt =>
      `Event ${evt.name.padEnd(16, " ")} ${iface.getEventTopic(evt)}`
    ),
    ...Object.values(iface.functions).map(fn =>
      `Function ${fn.name.padEnd(13, " ")} ${iface.getSighash(fn)}`
    ),
  ].join(`\n`);
};

export const toString = (val: number | string): string => math.toBN(val).toString();

export const toISOString = (val?: number | string): string => {
  const firstBlockTimeMs = 1438269988 * 1000; // timestamp of block #1 (genesis has no timestamp)
  if (!val) {
    return new Date(0).toISOString();
  } else if (typeof val === "string" && val.includes("T")) {
    return new Date(val).toISOString();
  } else {
    const time = typeof val === "number" ? val : math.toNum(val);
    return new Date(time < firstBlockTimeMs ? time * 1000 : time).toISOString();
  }
};

export const formatTraces = (traces: any[], meta: EvmMetadata): EvmTransfer[] => {
  const getAddress = (address: string): string => `${meta.name}/${getEvmAddress(address)}`;
  // NOTE: The first trace represents the tx itself, ignore it here
  return traces.slice(1).map(trace => ({
    to: getAddress(
      trace.type === "call" ? trace.action.to
      : trace.type === "create" ? trace.result.address
      : trace.type === "suicide" ? trace.action.refundAddress
      : AddressZero
    ),
    from: getAddress(
      trace.type === "call" ? trace.action.from
      : trace.type === "create" ? trace.action.from
      : trace.type === "suicide" ? trace.action.address
      : AddressZero
    ),
    value: formatEther(
      trace.type === "call" ? (trace.action.callType === "delegatecall" ? "0" : trace.action.value)
      : trace.type === "create" ? trace.action.value
      : trace.type === "suicide" ? trace.action.balance
      : "0"
    ),
  })).filter(t => math.gt(t.value, "0"));
};

export const getStatus = (tx: any, receipt: any): number => 
  // If post-byzantium, then the receipt already has a status, yay
  typeof receipt.status === "number" ? receipt.status
  : isHexString(receipt.status) ? math.toNum(receipt.status)
  // If pre-byzantium tx used less gas than the limit, it definitely didn't fail
  : math.toBN(tx.gasLimit || tx.gas).gt(math.toBN(receipt.gasUsed)) ? 1
  // If it used exactly 21000 gas, it's PROBABLY a simple transfer that succeeded
  : math.toBN(tx.gasLimit || tx.gas).eq(math.toBN("21000")) ? 1
  // Otherwise it PROBABLY failed
  : 0;

// Smallest difference is first, largest is last
// If diff in 1 is greater than diff in 2, swap them
export const diffAsc = (compareTo: DecString) => (t1: Transfer, t2: Transfer): number =>
  math.gt(
    math.diff(t1.amount, compareTo),
    math.diff(t2.amount, compareTo),
  ) ? 1 : -1;

// Clean up if/when I get feedback on https://github.com/ethers-io/ethers.js/issues/1831
export const parseEvent = (
  abi: any,
  evmLog: EvmTransactionLog,
  evmMeta?: EvmMetadata,
): { name: string; args: { [key: string]: string }; } => {
  const iface = abi.length ? new Interface(abi) : abi as Interface;
  const name = Object.values(iface.events).find(e =>
    iface.getEventTopic(e) === evmLog.topics[0]
  )?.name;
  const formatAddress = (address: string) => evmMeta ? `${evmMeta.name}/${address}` : address;
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
  const args = rawArgs.map(arg => arg.length === 42 ? formatAddress(arg) : arg) as any;
  Object.keys(rawArgs).forEach(key => {
    if ((key as any) % 1 === 0) return;
    args[key] = rawArgs[key].length === 42 ? formatAddress(rawArgs[key]) : rawArgs[key];
  });
  return { name, args };
};

export const getTransferCategory = (
  fromAccount: Account,
  toAccount: Account,
  addressBook: AddressBook,
): TransferCategory => {
  const { Self, Exchange } = AddressCategories;
  const { Fee, Expense, Income, Internal, SwapIn, SwapOut, Noop } = TransferCategories;
  const to = addressBook.getCategory(toAccount);
  const from = addressBook.getCategory(fromAccount);

  if (toAccount === fromAccount) {
    return Noop;

  } else if (to === Self && from === Self) {
    return Internal;

  } else if (from === Self && Object.keys(Guards).includes(toAccount)) {
    return Fee;

  } else if (to === Self && from === Exchange) {
    return SwapIn;
  } else if (from === Self && to === Exchange) {
    return SwapOut;

  } else if (to === Self) {
    return Income;
  } else if (from === Self) {
    return Expense;

  } else {
    return Noop;
  }
};
