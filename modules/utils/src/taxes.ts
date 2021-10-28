import { Type } from "@sinclair/typebox";
import { FieldTypes, Mapping } from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

const validateMapping = ajv.compile(Mapping);
export const getMappingError = (mapping: Mapping): string =>
  validateMapping(mapping)
    ? "" // TODO: assert no duplicate nicknames or fieldNames
    : validateMapping.errors.length ? formatErrors(validateMapping.errors)
    : `Invalid Mapping`;

export const getFormSchema = (mapping: Mapping): any =>
  Type.Object({
    ...mapping
      .filter(e => e.fieldType === FieldTypes.Boolean)
      .map(e => e.fieldName)
      .reduce((res, field) => ({ ...res, [field]: Type.Boolean() }), {}),
    ...mapping
      .filter(e => e.fieldType === FieldTypes.String)
      .map(e => e.fieldName)
      .reduce((res, field) => ({ ...res, [field]: Type.String() }), {}),
  });
