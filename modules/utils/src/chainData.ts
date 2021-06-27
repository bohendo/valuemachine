import { hexlify } from "@ethersproject/bytes";
import { keccak256 } from "@ethersproject/keccak256";
import { encode } from "@ethersproject/rlp";
import { Address, ChainDataJson } from "@valuemachine/types";
import Ajv from "ajv";
import addFormats from "ajv-formats";

export const getEmptyChainData = (): ChainDataJson => ({
  addresses: {},
  calls: [],
  transactions: [],
});

export const getNewContractAddress = (from: Address, nonce: number): Address => `0x${
  keccak256(encode([from, hexlify(nonce)])).substring(26).toLowerCase()
}`;


const ajv = addFormats(new Ajv()).addKeyword("kind").addKeyword("modifier");
const validateChainData = ajv.compile(ChainDataJson);

const formatErrors = errors => errors.map(error =>
  `${error.instancePath.replace("", "")}: ${error.message}`
).slice(0, 2).join(", ");

export const getChainDataError = (chainDataJson: ChainDataJson): string | null =>
  validateChainData(chainDataJson)
    ? null
    : validateChainData.errors.length ? formatErrors(validateChainData.errors)
    : `Invalid ChainData: ${JSON.stringify(chainDataJson)}`;
