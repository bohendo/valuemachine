import {
  DateString,
  Guard,
  Mapping,
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

////////////////////////////////////////
// Mapping

export const syncMapping = (form: string, master: Mapping, slave: Mapping): Mapping => {
  for (const m of master) {
    const s = slave.find(e => e.fieldName === m.fieldName);
    // Make sure all fields except nickname equal the values from the empty pdf
    if (!s) {
      log.warn(`Adding new entry for ${m.fieldName} to ${form} mappings`);
      slave.push({
        nickname: m.nickname,
        fieldName: m.fieldName,
        checkmark: m.checkmark,
      });
    } else if (m.checkmark) {
      s.checkmark = m.checkmark;
    }
  }
  for (const i of slave.map((_, i) => i)) {
    const s = slave[i];
    if ((s as any).fieldType) delete (s as any).fieldType;
    if (!master.find(m => m.fieldName === s.fieldName)) {
      log.warn(`Removing ${s.nickname} from ${form} mappings`);
      slave.splice(i, 1);
    }
  }
  return slave;
};

export const getTestForm = mapping =>
  mapping.reduce((form, entry) => ({
    ...form,
    [entry.nickname]: entry.checkmark ? true : entry.nickname,
  }), {});

export const getTestReturn = mappings =>
  Object.keys(mappings).reduce((forms, form) => ({
    ...forms,
    [form]: getTestForm(mappings[form]),
  }), {});
