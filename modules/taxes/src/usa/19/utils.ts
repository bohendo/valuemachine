import {
  DecString,
  TaxActions,
  TaxRow,
} from "@valuemachine/types";
import { getLogger, math } from "@valuemachine/utils";

import { FormArchive, TaxYears } from "../../mappings";
import { maxint, getGetIncomeTax } from "../utils";

export * from "../utils";

export type Forms = FormArchive["USA19"];

export const taxYear = TaxYears.USA19;
export const logger = getLogger("info", taxYear);

// brackets should match some source of truth idk what
export const getIncomeTax = getGetIncomeTax([
  { rate: "0.10", single: "9700",   joint: "19400",  head: "13850" },
  { rate: "0.12", single: "39475",  joint: "78950",  head: "52850" },
  { rate: "0.22", single: "84200",  joint: "168400", head: "84200" },
  { rate: "0.24", single: "160725", joint: "321450", head: "160700" },
  { rate: "0.32", single: "204100", joint: "408200", head: "204100" },
  { rate: "0.35", single: "510300", joint: "612350", head: "510300" },
  { rate: "0.37", single: maxint, joint: maxint, head: maxint },
]);

export const processIncome = (
  taxes: TaxRow[],
  callback: (row: TaxRow, value: DecString) => void,
): void => {
  taxes
    .filter(row => row.action === TaxActions.Income && math.gt(row.value, "0"))
    .forEach((income: TaxRow): void => {
      callback(income, math.mul(income.value, income.tag?.multiplier || "1"));
    });
};

export const processExpenses = (
  taxes: TaxRow[],
  callback: (row: TaxRow, value: DecString) => void,
): void => {
  taxes
    .filter(row => row.action === TaxActions.Expense && math.gt(row.value, "0"))
    .forEach((expense: TaxRow): void => {
      callback(expense, math.mul(expense.value, expense.tag?.multiplier || "1"));
    });
};
