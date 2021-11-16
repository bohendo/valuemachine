import { Mapping, TaxInput, TaxRows } from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

export const getEmptyTaxInput = (): TaxInput => ({});
export const getEmptyTaxRows = (): TaxRows => [];

const getDupProps = (list: any[], prop: string) => {
  const occurred = [];
  return list.reduce((dup, entry) => {
    if (dup) return dup; // short-circuit as soon as we find the first dup;
    if (occurred.includes(entry[prop])) return entry[prop];
    occurred.push(entry[prop]);
    return "";
  }, "");
};

const validateMapping = ajv.compile(Mapping);
export const getMappingError = (mapping: Mapping): string =>
  validateMapping(mapping)
    ? (getDupProps(mapping, "nickname")
      ? `Duplicate nickname: ${getDupProps(mapping, "nickname")}`
      : (getDupProps(mapping, "fieldName")
        ? `Duplicate fieldName: ${getDupProps(mapping, "fieldName")}`
        : ""
      )
    ) : validateMapping.errors.length
      ? formatErrors(validateMapping.errors)
      : `Invalid Mapping`;

const validateTaxInput = ajv.compile(TaxInput);
export const getTaxInputError = (taxInput: TaxInput): string =>
  validateTaxInput(taxInput)
    ? ""
    : validateTaxInput.errors.length ? formatErrors(validateTaxInput.errors)
    : `Invalid TaxInput`;

const validateTaxRows = ajv.compile(TaxRows);
export const getTaxRowsError = (taxRows: TaxRows): string =>
  validateTaxRows(taxRows)
    ? ""
    : validateTaxRows.errors.length ? formatErrors(validateTaxRows.errors)
    : `Invalid TaxRows`;
