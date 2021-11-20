import {
  DateString,
  DecString,
  Guard,
  Tag,
  TaxRows,
  IntString,
  TaxYear,
  Year,
} from "@valuemachine/types";
import { getLogger, math } from "@valuemachine/utils";

import { taxYearCutoffs } from "./constants";

export const log = getLogger("info");

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
// TaxYear

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
  filterTag?: Tag,
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

export const getTotalValue = (rows: TaxRows, filterAction?: string, filterTag?: Tag) =>
  getRowTotal(rows, filterAction || "", filterTag || {}, row => row.value);
