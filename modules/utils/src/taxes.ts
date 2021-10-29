import { Mapping } from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

const validateMapping = ajv.compile(Mapping);
export const getMappingError = (mapping: Mapping): string =>
  validateMapping(mapping)
    ? "" // TODO: assert no duplicate nicknames or fieldNames
    : validateMapping.errors.length ? formatErrors(validateMapping.errors)
    : `Invalid Mapping`;
