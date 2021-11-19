import {
  DateString,
  Guard,
  TaxYear,
} from "@valuemachine/types";
import { getLogger, math } from "@valuemachine/utils";

import { taxYearCutoffs } from "./constants";

export const log = getLogger("info");

////////////////////////////////////////
// Date

export const toTime = (d: DateString): number => new Date(d).getTime();

export const before = (d1: DateString, d2: DateString): boolean => toTime(d1) < toTime(d2);
export const after = (d1: DateString, d2: DateString): boolean => toTime(d1) > toTime(d2);

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
