import {
  FieldTypes,
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
  for (const mEntry of master) {
    const sEntry = slave.find(e => e.fieldName === mEntry.fieldName);
    // Make sure all fields except nickname equal the values from the empty pdf
    if (!sEntry) {
      log.warn(`Adding new entry for ${mEntry.fieldName} to ${form} mappings`);
      slave.push({
        nickname: mEntry.nickname,
        fieldName: mEntry.fieldName,
        fieldType: mEntry.fieldType,
        checkmark: mEntry.checkmark,
      });
    } else if (sEntry.fieldType !== mEntry.fieldType) {
      log.warn(`Replacing ${form}.${sEntry.nickname}.fieldType with ${mEntry.fieldType}`);
      sEntry.fieldType = mEntry.fieldType;
    } else if (sEntry.checkmark && !mEntry.checkmark) {
      log.warn(`Removing ${form}.${sEntry.nickname} checkmark`);
      delete sEntry.checkmark;
    } else if (sEntry.checkmark !== mEntry.checkmark) {
      log.warn(`Replacing ${form}.${sEntry.nickname} checkmark with ${mEntry.checkmark}`);
      sEntry.checkmark = mEntry.checkmark;
    }
  }
  for (const i in slave) {
    const sEntry = slave[i];
    if (!master.find(mEntry => mEntry.fieldName === sEntry.fieldName)) {
      log.warn(`Removing ${sEntry.nickname} from ${form} mappings`);
      slave.splice(i, 1);
    }
  }
  return slave;
};

export const getTestForm = mapping =>
  mapping.reduce((form, entry) => ({
    ...form,
    [entry.nickname]: entry.fieldType === FieldTypes.Boolean ? true : entry.nickname,
  }), {});

export const getTestReturn = mappings =>
  Object.keys(mappings).reduce((forms, form) => ({
    ...forms,
    [form]: getTestForm(mappings[form]),
  }), {});
