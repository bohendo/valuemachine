import { Bytes32 } from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

const validateBytes32 = ajv.compile(Bytes32);
export const getBytes32Error = (address: Bytes32): string | null =>
  validateBytes32(address)
    ? null
    : validateBytes32.errors.length ? formatErrors(validateBytes32.errors)
    : `Invalid Bytes32: ${JSON.stringify(address)}`;
