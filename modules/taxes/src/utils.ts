import { TimestampString } from "@finances/types";
import { ContextLogger, LevelLogger, math } from "@finances/utils";

import { env } from "./env";

export const getIncomeTax = (taxableIncome: string, filingStatus: string): string => {
  const taxBrackets19 = [
    { rate: "0.10", single: "9700",   joint: "19400",  head: "13850" },
    { rate: "0.12", single: "39475",  joint: "78950",  head: "52850" },
    { rate: "0.22", single: "84200",  joint: "168400", head: "84200" },
    { rate: "0.24", single: "160725", joint: "321450", head: "160700" },
    { rate: "0.32", single: "204100", joint: "408200", head: "204100" },
    { rate: "0.35", single: "510300", joint: "612350", head: "510300" },
    { rate: "0.37", single: "510300", joint: "612350", head: "0" },
  ];

  let incomeTax = "0";
  taxBrackets19.forEach((bracket, index) => {
    if (math.gt(taxableIncome, bracket[filingStatus])) {
      incomeTax = math.add(
        incomeTax,
        math.mul(
          bracket.rate, math.sub(
            index === taxBrackets19.length - 1
              ? taxBrackets19[index + 1][filingStatus]
              : taxableIncome,
            bracket[filingStatus],
          ),
        ),
      );
    }
  });
  return incomeTax;
};

export const toFormDate = (date: TimestampString): string => {
  const pieces = date.split("T")[0].split("-");
  return `${pieces[1]}, ${pieces[2]}, ${pieces[0]}`;
};

export const emptyForm = (form): any => {
  const emptyForm = JSON.parse(JSON.stringify(form));
  for (const key of Object.keys(emptyForm)) {
    emptyForm[key] = "";
  }
  return emptyForm;
};

// Replace any values in "form" with "values"
export const mergeForms = (form, values): any => {
  const newForm = JSON.parse(JSON.stringify(form));
  for (const key of Object.keys(newForm)) {
    if (values && values[key]) {
      newForm[key] = values[key];
    }
  }
  return newForm;
};

export const translate = (form, mappings): any => {
  const newForm = {};
  for (const [key, value] of Object.entries(form)) {
    if (key === "default") { continue; }
    if (!mappings[key]) {
      new ContextLogger("TranslateForms", new LevelLogger(env.logLevel))
        .warn(`Key ${key} exists in output data but not in mappings`);
    }
    if (
      !["_dec", "_int"].some(suffix => key.endsWith(suffix)) &&
      key.match(/L[0-9]/) &&
      typeof value === "string" &&
      value.match(/^-?[0-9.]+$/)
    ) {
      newForm[mappings[key]] = math.round(value);
      if (newForm[mappings[key]].startsWith("-")) {
        newForm[mappings[key]] = `(${newForm[mappings[key]].substring(1)})`;
      }
    } else {
      newForm[mappings[key]] = value;
    }
  }
  return newForm;
};
