import { hexlify } from "@ethersproject/bytes";
import { keccak256 } from "@ethersproject/keccak256";
import { encode } from "@ethersproject/rlp";
import { EvmAddress, EvmTransaction, EvmDataJson } from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

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
