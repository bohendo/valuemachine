import { MaxUint256 } from "@ethersproject/constants";
import {
  BusinessExpenseTypes,
  IncomeTypes,
} from "@valuemachine/transactions";
import {
  DecString,
} from "@valuemachine/types";
import { math } from "@valuemachine/utils";

import {
  FilingStatuses,
  TaxActions,
} from "../enums";
import {
  toTime,
  getRowTotal,
} from "../utils";
import {
  TaxInput,
  TaxRow,
  TaxRows,
} from "../types";

export { chrono, math } from "@valuemachine/utils";

export { TaxYears } from "../mappings";

export const maxint = MaxUint256.toString();
export const msPerDay = 1000 * 60 * 60 * 24;
export const msPerYear = msPerDay * 365;

////////////////////////////////////////
// Expense

export const isBusinessExpense = (row: TaxRow): boolean =>
  row.action === TaxActions.Expense
    && row.tag
    && Object.keys(BusinessExpenseTypes).some(t => row.tag.expenseType === t);

////////////////////////////////////////
// Capital

export const isLongTermTrade = (row: TaxRow): boolean =>
  toTime(row.date) - toTime(row.receiveDate) > msPerYear;

export const isShortTermTrade = (row: TaxRow): boolean =>
  toTime(row.date) - toTime(row.receiveDate) > msPerYear;

export const getTotalCapitalChange = (input: TaxInput, rows: TaxRows) =>
  getRowTotal(
    rows,
    TaxActions.Trade,
    {},
    row => row.capitalChange
  );

////////////////////////////////////////
// Income

// Gross business income minus deductible expenses
export const getNetBusinessIncome = (rows) =>
  math.subToZero(
    getRowTotal(
      rows,
      TaxActions.Income,
      { incomeType: IncomeTypes.Business }
    ),
    getRowTotal(rows.filter(isBusinessExpense)),
  );

export const getTotalIncome = (input: TaxInput, rows: TaxRows) =>
  math.add(
    getNetBusinessIncome(rows),
    // get total non-business income
    getRowTotal(
      rows,
      TaxActions.Income,
      {},
      row => row.tag.incomeType === IncomeTypes.Business ? "0" : row.value
    ),
    getTotalCapitalChange(input, rows),
  );

export const getTotalTaxableIncome = getTotalIncome;

////////////////////////////////////////
// Tax

export const getIncomeTax = (input: TaxInput, rows: TaxRows): DecString => {
  const taxableIncome = getTotalIncome(input, rows);
  const filingStatus = input.personal?.filingStatus;
  // brackets should match https://incometaxindia.gov.in/Tutorials/2%20Tax%20Rates.pdf
  const taxBrackets = [
    { rate: "0.00", single: "250000",  old: "300000",  veryOld: "500000",  family: "250000" },
    { rate: "0.05", single: "500000",  old: "500000",  veryOld: "500000",  family: "500000" },
    { rate: "0.20", single: "1000000", old: "1000000", veryOld: "1000000", family: "1000000" },
    { rate: "0.30", single: maxint,    old: maxint,    veryOld: maxint,    family: maxint },
  ];
  let incomeTax = "0";
  let prevThreshold = "0";
  taxBrackets.forEach(bracket => {
    const threshold = !filingStatus ? "1" : (
      filingStatus === FilingStatuses.Single || filingStatus === FilingStatuses.Separate
    ) ? bracket.single : (
        filingStatus === FilingStatuses.Joint || filingStatus === FilingStatuses.Widow
      ) ? bracket.family
        : "1"; // we should also check age to see if we qualify for senior tax rates
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

// we still need to properly apply Indian income/cap gain rules
export const getTotalTax = (input, rows) => getIncomeTax(input, rows);
