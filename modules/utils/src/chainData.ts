import { hexlify } from "@ethersproject/bytes";
import { keccak256 } from "@ethersproject/keccak256";
import { encode } from "@ethersproject/rlp";
import { Address, ChainDataJson, EthTransaction } from "@valuemachine/types";

import { getPropertyError } from "./validate";

export const getEmptyChainData = (): ChainDataJson => ({
  addresses: {},
  calls: [],
  transactions: [],
});

export const getNewContractAddress = (from: Address, nonce: number): Address => `0x${
  keccak256(encode([from, hexlify(nonce)])).substring(26).toLowerCase()
}`;

export const getEthTransactionError = (transaction: EthTransaction): string | null => {
  if (!transaction) {
    return `Transaction is falsy: (typeof=${typeof transaction}) ${transaction}`;
  }
  for (const { key, expected } of [
    { key: "block", expected: "number" },
    { key: "data", expected: "string" },
    { key: "from", expected: "string" },
    { key: "gasPrice", expected: "string" },
    { key: "gasUsed", expected: "string" },
    { key: "hash", expected: "string" },
    { key: "index", expected: "number" },
    { key: "logs", expected: "object" },
    { key: "nonce", expected: "number" },
    { key: "status", expected: "number" },
    { key: "timestamp", expected: "string" },
    { key: "to", expected: ["string", "null"] },
    { key: "value", expected: "string" },
  ]) {
    const typeError = getPropertyError(transaction, key, expected);
    if (typeError) {
      return typeError;
    }
  }
  return null;
};

export const getChainDataError = (chainData: ChainDataJson) => 
  chainData ? null : "Chain Data is falsy";
