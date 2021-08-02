import { hexlify } from "@ethersproject/bytes";
import { keccak256 } from "@ethersproject/keccak256";
import { encode } from "@ethersproject/rlp";
import { Address, EvmTransaction, EvmDataJson } from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

export const getEmptyEvmData = (): EvmDataJson => ({
  addresses: {},
  transactions: {},
});

export const getNewContractAddress = (from: Address, nonce: number): Address => `0x${
  keccak256(encode([from, hexlify(nonce)])).substring(26).toLowerCase()
}`;

const validateEvmData = ajv.compile(EvmDataJson);
export const getEvmDataError = (evmDataJson: EvmDataJson): string | null =>
  validateEvmData(evmDataJson)
    ? null
    : validateEvmData.errors.length ? formatErrors(validateEvmData.errors)
    : `Invalid EvmData: ${JSON.stringify(evmDataJson)}`;

const validateEvmTransaction = ajv.compile(EvmTransaction);
export const getEvmTransactionError = (ethTx: EvmTransaction): string | null =>
  validateEvmTransaction(ethTx)
    ? null
    : validateEvmTransaction.errors.length ? formatErrors(validateEvmTransaction.errors)
    : `Invalid EvmTransaction: ${JSON.stringify(ethTx)}`;
