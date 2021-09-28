import { /*defaultAbiCoder, AbiCoder,*/ Interface } from "@ethersproject/abi";
import { getAddress as getEvmAddress } from "@ethersproject/address";
import { isHexString } from "@ethersproject/bytes";
import { AddressZero } from "@ethersproject/constants";
import { formatEther } from "@ethersproject/units";
import {
  AddressBook,
  AddressCategories,
  DecimalString,
  EvmMetadata,
  EvmTransactionLog,
  EvmTransfer,
  Transfer,
  TransferCategories,
} from "@valuemachine/types";
import { diff, gt, toBN } from "@valuemachine/utils";

export const toNumber = (val: number | string): number => toBN(val).toNumber();

export const toString = (val: number | string): string => toBN(val).toString();

export const toISOString = (val?: number | string): string => {
  const firstBlockTimeMs = 1438269988 * 1000; // timestamp of block #1 (genesis has no timestamp)
  if (!val) {
    return new Date(0).toISOString();
  } else if (typeof val === "string" && val.includes("T")) {
    return new Date(val).toISOString();
  } else {
    const time = typeof val === "number" ? val : toBN(val).toNumber();
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
  })).filter(t => gt(t.value, "0"));
};

export const getStatus = (tx: any, receipt: any): number => 
  // If post-byzantium, then the receipt already has a status, yay
  typeof receipt.status === "number" ? receipt.status
  : isHexString(receipt.status) ? toBN(receipt.status).toNumber()
  // If pre-byzantium tx used less gas than the limit, it definitely didn't fail
  : toBN(tx.gasLimit || tx.gas).gt(toBN(receipt.gasUsed)) ? 1
  // If it used exactly 21000 gas, it's PROBABLY a simple transfer that succeeded
  : toBN(tx.gasLimit || tx.gas).eq(toBN("21000")) ? 1
  // Otherwise it PROBABLY failed
  : 0;

// Smallest difference is first, largest is last
// If diff in 1 is greater than diff in 2, swap them
export const diffAsc = (compareTo: DecimalString) => (t1: Transfer, t2: Transfer): number =>
  gt(
    diff(t1.amount, compareTo),
    diff(t2.amount, compareTo),
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
  const args = rawArgs.map(arg => arg.length === 42 ? formatAddress(arg) : arg) as any;
  Object.keys(rawArgs).forEach(key => {
    if ((key as any) % 1 === 0) return;
    args[key] = rawArgs[key].length === 42 ? formatAddress(rawArgs[key]) : rawArgs[key];
  });
  return { name, args };
};

export const categorizeTransfer = (transfer: Transfer, addressBook: AddressBook): Transfer => {
  const { Self, Exchange } = AddressCategories;
  const { Expense, Income, Internal, SwapIn, SwapOut, Unknown } = TransferCategories;
  const to = addressBook.getCategory(transfer.to);
  const from = addressBook.getCategory(transfer.from);

  // Internal
  if (to === Self && from === Self) {
    transfer.category = Internal;

  // Swaps
  } else if (to === Self && from === Exchange) {
    transfer.category = SwapIn;
  } else if (from === Self && to === Exchange) {
    transfer.category = SwapOut;

    /* Deposit/Withdrawals (should we update account names?)
  } else if (to === Self && from === Defi) {
    transfer.category = Internal;
  } else if (from === Self && to === Defi) {
    transfer.category = Internal;
  */

  // Income/Expense
  } else if (to === Self) {
    transfer.category = Income;
  } else if (from === Self) {
    transfer.category = Expense;

  } else {
    transfer.category = Unknown;
  }

  return transfer;
};
