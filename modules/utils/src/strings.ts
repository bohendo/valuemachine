import { Address, Bytes32 } from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

const validateAddress = ajv.compile(Address);
export const getAddressError = (address: Address): string | null =>
  validateAddress(address)
    ? null
    : validateAddress.errors.length ? formatErrors(validateAddress.errors)
    : `Invalid Address: ${JSON.stringify(address)}`;

const validateBytes32 = ajv.compile(Bytes32);
export const getBytes32Error = (address: Bytes32): string | null =>
  validateBytes32(address)
    ? null
    : validateBytes32.errors.length ? formatErrors(validateBytes32.errors)
    : `Invalid Bytes32: ${JSON.stringify(address)}`;
