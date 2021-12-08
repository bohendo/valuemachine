import { TxTag } from "@valuemachine/transactions";
import {
  DateString,
  DecString,
  Guard,
  IntString,
  TaxYear,
  Year,
} from "@valuemachine/types";
import { ajv, formatErrors, getLogger, math } from "@valuemachine/utils";

import { taxYearCutoffs } from "./constants";
import { Mapping, TaxInput, TaxRows } from "./types";

export const log = getLogger("info");

export const getEmptyTaxInput = (): TaxInput => ({});
export const getEmptyTaxRows = (): TaxRows => [];

////////////////////////////////////////
// String

export const strcat = (los: string[], delimiter = " "): string =>
  los.filter(s => !!s).join(delimiter);

////////////////////////////////////////
// Date

export const toTime = (d: DateString): number => new Date(d).getTime();
export const before = (d1: DateString, d2: DateString): boolean => toTime(d1) < toTime(d2);
export const after = (d1: DateString, d2: DateString): boolean => toTime(d1) > toTime(d2);

export const daysInYear = (year: Year): IntString => {
  const y = parseInt(year);
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? "366" : "365";
};

////////////////////////////////////////
// Validation

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

////////////////////////////////////////
// TaxYear

export const splitTaxYear = (taxYear: TaxYear): string[] => [
  taxYear.substring(0, 3),
  taxYear.substring(3, 7),
];

export const getTaxYear = (guard: Guard, date: DateString): TaxYear => {
  const year = date.split("-")[0];
  const cutoff = (taxYearCutoffs[guard] || taxYearCutoffs.default).replace(/^0000/, year);
  return `${guard}${
    after(cutoff, date) ? year : (parseInt(year) + 1).toString()
  }`;
};

export const getTaxYearBoundaries = (guard: Guard, year: string): [number, number] => {
  if (!year?.match(/^[0-9]{4}$/)) return [0, 5000000000000]; // from 1970 until after 2100
  const prevYear = math.round(math.sub(year, "1"), 0).padStart(4, "0");
  return taxYearCutoffs[guard] ? [
    new Date(taxYearCutoffs[guard].replace(/^0000/, prevYear)).getTime(),
    new Date(taxYearCutoffs[guard].replace(/^0000/, year)).getTime(),
  ] : [
    new Date(taxYearCutoffs.default.replace(/^0000/, prevYear)).getTime(),
    new Date(taxYearCutoffs.default.replace(/^0000/, year)).getTime(),
  ];
};

export const inTaxYear = (guard, year) => row => {
  if (!year || !year?.match(/^[0-9]{4}$/)) return true; // eg if year is "All"
  const taxYearBoundaries = getTaxYearBoundaries(guard, year);
  const time = new Date(row.date).getTime();
  return time > taxYearBoundaries[0] && time <= taxYearBoundaries[1];
};

////////////////////////////////////////
// Total Value

export const sumRows = (
  rows: TaxRows,
  mapRow?: (row) => DecString,
) => 
  rows.reduce((tot, row) => (
    math.add(tot, math.mul(
      mapRow ? mapRow(row) : row.value,
      row.tag.multiplier || "1",
    ))
  ), "0");

export const getRowTotal = (
  rows: TaxRows,
  filterAction?: string,
  filterTag?: TxTag,
  mapRow?: (row) => DecString,
) => 
  sumRows(
    rows.filter(row =>
      !filterAction || filterAction === row.action
    ).filter(row =>
      !filterTag || Object.keys(filterTag || {}).every(tagType =>
        row.tag[tagType] === filterTag[tagType]
      )
    ),
    mapRow,
  );

export const getTotalValue = (rows: TaxRows, filterAction?: string, filterTag?: TxTag) =>
  getRowTotal(rows, filterAction || "", filterTag || {}, row => row.value);
