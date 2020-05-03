import { TimestampString } from "@finances/types";
import { ContextLogger, LevelLogger, math } from "@finances/utils";

import { env } from "./env";

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
