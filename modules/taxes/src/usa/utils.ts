import { MaxUint256 } from "@ethersproject/constants";
import { Guards } from "@valuemachine/transactions";
import {
  DecString,
  FilingStatus,
  FilingStatuses,
  IncomeType,
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
  FilingStatuses,
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

export const getTotalIncome = (incomeType: IncomeType, rows: TaxRow[]) =>
  rows.filter(row => row.tag.incomeType === incomeType).reduce((tot, row) =>
    math.add(tot, row.tag.multiplier
      ? math.mul(row.value, row.tag.multiplier)
      : row.value
    ), "0");

// ISO => "MM, DD, YY"
export const toFormDate = (date: DateString): string => {
  const pieces = date.split("T")[0].split("-");
  return `${pieces[1]}, ${pieces[2]}, ${pieces[0]}`;
};

export const getGetIncomeTax = (
  taxBrackets: Array<{ rate: DecString; single: IntString; joint: IntString; head: IntString }>,
) => (
  taxableIncome: DecString,
  filingStatus: FilingStatus,
): DecString => {
  let incomeTax = "0";
  let prevThreshold = "0";
  taxBrackets.forEach(bracket => {
    const threshold = !filingStatus ? "1" : (
      filingStatus === FilingStatuses.Single || filingStatus === FilingStatuses.Separate
    ) ? bracket.single : (
        filingStatus === FilingStatuses.Joint || filingStatus === FilingStatuses.Widow
      ) ? bracket.joint : (
          filingStatus === FilingStatuses.Head
        ) ? bracket.head : "1";
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
