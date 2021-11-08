import { MaxUint256 } from "@ethersproject/constants";
import { Static, Type } from "@sinclair/typebox";
import { Guards } from "@valuemachine/transactions";
import {
  DecString,
  IntString,
  TaxRow,
  TaxActions,
  DateString,
} from "@valuemachine/types";
import { math } from "@valuemachine/utils";

export {
  Asset,
  DateString,
  DecString,
  EventTypes,
  ExpenseTypes,
  IncomeTypes,
  IntString,
  Logger,
  TaxActions,
  TaxInput,
  TaxRow,
} from "@valuemachine/types";
export { math } from "@valuemachine/utils";

export { TaxYears } from "../mappings";

export const guard = Guards.USA;

export const maxint = MaxUint256.toString();

export const FilingStatuses = {
  Single: "Single", // single or married separate
  Joint: "Joint", // married joint or widow
  Head: "Head", // head of household
} as const;
export const FilingStatus = Type.Enum(FilingStatuses); // NOT Extensible
export type FilingStatus = Static<typeof FilingStatus>;

// ISO => "MM, DD, YY"
export const toFormDate = (date: DateString): string => {
  const pieces = date.split("T")[0].split("-");
  return `${pieces[1]}, ${pieces[2]}, ${pieces[0]}`;
};

export const getGetIncomeTax = (
  taxBrackets: Array<{ rate: DecString; single: IntString; joint: IntString; head: IntString }>,
) => (
  taxableIncome: string,
  filingStatus: FilingStatus,
): string => {
  let incomeTax = "0";
  let prevThreshold = "0";
  taxBrackets.forEach(bracket => {
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

export const processIncome = (
  taxes: TaxRow[],
  callback: (row: TaxRow, value: DecString) => void,
): void => {
  taxes
    .filter(row => row.action === TaxActions.Income && math.gt(row.value, "0"))
    .forEach((income: TaxRow): void => {
      callback(income, math.mul(income.value, income.tags?.multiplier || "1"));
    });
};

export const processExpenses = (
  taxes: TaxRow[],
  callback: (row: TaxRow, value: DecString) => void,
): void => {
  taxes
    .filter(row => row.action === TaxActions.Expense && math.gt(row.value, "0"))
    .forEach((expense: TaxRow): void => {
      callback(expense, math.mul(expense.value, expense.tags?.multiplier || "1"));
    });
};
