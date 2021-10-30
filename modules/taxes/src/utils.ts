import {
  Guard,
  Mapping,
} from "@valuemachine/types";
import {
  getLogger,
  round,
  sub,
} from "@valuemachine/utils";

import { taxYearMap } from "./constants";

export const log = getLogger("info");

/*
import { ajv, formatErrors } from "@valuemachine/utils";
const validateUSA20Forms = ajv.compile(Forms_USA20);
export const getUSA20Error = (forms: Forms_USA20): string =>
  validateUSA20Forms(forms)
    ? ""
    : validateUSA20Forms.errors.length ? formatErrors(validateUSA20Forms.errors)
    : `Invalid USA20 forms: ${JSON.stringify(forms)}`;
const validateUSA19Forms = ajv.compile(Forms_USA19);
export const getUSA19Error = (forms: Forms_USA19): string =>
  validateUSA19Forms(forms)
    ? ""
    : validateUSA19Forms.errors.length ? formatErrors(validateUSA19Forms.errors)
    : `Invalid USA19 forms: ${JSON.stringify(forms)}`;
*/

export const getTaxYearBoundaries = (guard: Guard, taxYear: string): [number, number] => {
  if (!taxYear?.match(/^[0-9]{4}$/)) return [0, 5000000000000]; // from 1970 until after 2100
  const prevYear = round(sub(taxYear, "1"), 0).padStart(4, "0");
  return taxYearMap[guard] ? [
    new Date(taxYearMap[guard].replace(/^0000/, prevYear)).getTime(),
    new Date(taxYearMap[guard].replace(/^0000/, taxYear)).getTime(),
  ] : [
    new Date(taxYearMap.default.replace(/^0000/, prevYear)).getTime(),
    new Date(taxYearMap.default.replace(/^0000/, taxYear)).getTime(),
  ];
};

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
