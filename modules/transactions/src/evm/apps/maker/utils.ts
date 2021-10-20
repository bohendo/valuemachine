import { Interface } from "@ethersproject/abi";
import { HashZero } from "@ethersproject/constants";
import {
  EvmTransactionLog,
} from "@valuemachine/types";

export const parseLogNote = (
  abi: string[],
  ethLog: EvmTransactionLog,
): { name: string; args: string[]; } => {
  const iface = new Interface(abi);
  return {
    name: Object.values(iface.functions).find(e =>
      ethLog.topics[0].startsWith(iface.getSighash(e))
    )?.name,
    args: ethLog.data
      .substring(2 + 64 + 64 + 8)
      .match(/.{1,64}/g)
      .filter(e => e !== "0".repeat(64 - 8))
      .map(s => `0x${s}`)
      .map(str => [HashZero, "0x"].includes(str)
        ? "0x00"
        : str.startsWith("0x000000000000000000000000")
          ? `0x${str.substring(26)}`
          : str
      ),
  };
};
