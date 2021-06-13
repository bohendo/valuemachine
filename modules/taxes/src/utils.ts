import { MaxUint256 } from "@ethersproject/constants";
import { Events, IncomeEvent, ExpenseEvent, EventTypes, TimestampString } from "@valuemachine/types";
import { getLogger, math } from "@valuemachine/utils";

import { env } from "./env";

export const logger = getLogger(env.logLevel);

export const processIncome = (
  vmEvents: Events,
  callback: (event: IncomeEvent, value: string) => void,
): void => {
  vmEvents.filter(event =>
    event.type === EventTypes.Income &&
    math.gt(event.quantity, "0") &&
    !event.tags.includes("ignore"),
  ).forEach((income: IncomeEvent): void => {
    let value = math.mul(income.quantity, income.assetPrice);
    if (income.tags.includes("ignore")) {
      return;
    } else if (income.tags.some(tag => tag.startsWith("multiply-"))) {
      const tag = income.tags.find(tag => tag.startsWith("multiply-"));
      const multiplier = tag.split("-")[1];
      value = math.mul(value, multiplier);
    }
    callback(income, value);
  });
};

export const processExpenses = (
  vmEvents: Events,
  callback: (event: ExpenseEvent, value: string) => void,
): void => {
  vmEvents.filter(event =>
    event.type === EventTypes.Expense &&
    math.gt(event.quantity, "0") &&
    !event.tags.includes("ignore"),
  ).forEach((event: ExpenseEvent): void => {
    let value = math.round(math.mul(event.quantity, event.assetPrice));
    if (event.tags.some(tag => tag.startsWith("multiply-"))) {
      const tag = event.tags.find(tag => tag.startsWith("multiply-"));
      const multiplier = tag.split("-")[1];
      value = math.mul(value, multiplier);
    }
    callback(event, value);
  });
};

export const getIncomeTax = (taxableIncome: string, filingStatus: string): string => {
  const inf = MaxUint256.toString();
  const taxBrackets19 = [
    { rate: "0.10", single: "9700",   joint: "19400",  head: "13850" },
    { rate: "0.12", single: "39475",  joint: "78950",  head: "52850" },
    { rate: "0.22", single: "84200",  joint: "168400", head: "84200" },
    { rate: "0.24", single: "160725", joint: "321450", head: "160700" },
    { rate: "0.32", single: "204100", joint: "408200", head: "204100" },
    { rate: "0.35", single: "510300", joint: "612350", head: "510300" },
    { rate: "0.37", single: inf, joint: inf, head: inf },
  ];

  let incomeTax = "0";
  let prevThreshold = "0";
  taxBrackets19.forEach(bracket => {
    const threshold = bracket[filingStatus];
    if (math.lt(taxableIncome, prevThreshold)) {
      return;
    } else if (math.lt(taxableIncome, threshold)) {
      incomeTax = math.add(
        incomeTax,
        math.mul(
          bracket.rate,
          math.sub(taxableIncome, prevThreshold),
        ),
      );
    } else {
      incomeTax = math.add(
        incomeTax,
        math.mul(
          bracket.rate,
          math.sub(threshold, prevThreshold),
        ),
      );
    }
    prevThreshold = threshold;
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
      logger.child({ module: "TranslateForms" }).warn(
        `Key ${key} exists in output data but not in mappings`
      );
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
