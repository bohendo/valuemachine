import { hexlify } from "@ethersproject/bytes";
import { keccak256 } from "@ethersproject/keccak256";
import { encode } from "@ethersproject/rlp";
import { Address, EthTransaction, EvmDataJson } from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

export const getEmptyEvmData = (): EvmDataJson => ({
  addresses: {},
  calls: [],
  transactions: [],
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

const validateEthTransaction = ajv.compile(EthTransaction);
export const getEthTransactionError = (ethTx: EthTransaction): string | null =>
  validateEthTransaction(ethTx)
    ? null
    : validateEthTransaction.errors.length ? formatErrors(validateEthTransaction.errors)
    : `Invalid EthTransaction: ${JSON.stringify(ethTx)}`;
