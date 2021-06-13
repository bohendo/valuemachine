import { hexlify } from "@ethersproject/bytes";
import { keccak256 } from "@ethersproject/keccak256";
import { encode } from "@ethersproject/rlp";
import { Address } from "@valuemachine/types";

import { sm } from "./utils";

export const getNewContractAddress = (from: Address, nonce: number): Address => sm(`0x${
  keccak256(encode([from, hexlify(nonce)])).substring(26)
}`);
