import { DecString, TaxActions, TaxRow, TaxRows } from "@valuemachine/types";
import { getLogger, math } from "@valuemachine/utils";

import { FormArchive, TaxYears } from "../../mappings";
import { getGetIncomeTax } from "../utils";

export * from "../utils";

export type Forms = FormArchive["USA2019"];

export const year = "2019";
export const taxYear = TaxYears.USA2019;
export const logger = getLogger("info", taxYear);

// brackets should match some source of truth idk what
export const getIncomeTax = getGetIncomeTax(year);

export const processIncome = (
  taxes: TaxRows,
  callback: (row: TaxRow, value: DecString) => void,
): void => {
  taxes
    .filter(row => row.action === TaxActions.Income && math.gt(row.value, "0"))
    .forEach((income: TaxRow): void => {
      callback(income, math.mul(income.value, income.tag?.multiplier || "1"));
    });
};

export const processExpenses = (
  taxes: TaxRows,
  callback: (row: TaxRow, value: DecString) => void,
): void => {
  taxes
    .filter(row => row.action === TaxActions.Expense && math.gt(row.value, "0"))
    .forEach((expense: TaxRow): void => {
      callback(expense, math.mul(expense.value, expense.tag?.multiplier || "1"));
    });
};
