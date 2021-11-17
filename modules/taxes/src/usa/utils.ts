import { MaxUint256 } from "@ethersproject/constants";
import { Guards } from "@valuemachine/transactions";
import {
  BusinessExpenseTypes,
  DateString,
  DecString,
  FilingStatus,
  FilingStatuses,
  IncomeTypes,
  IntString,
  Tag,
  TaxActions,
  TaxRow,
  TaxRows,
} from "@valuemachine/types";
import { math } from "@valuemachine/utils";

export { chrono, math } from "@valuemachine/utils";

export { TaxYears } from "../mappings";

export const guard = Guards.USA;

export const maxint = MaxUint256.toString();
export const msPerDay = 1000 * 60 * 60 * 24;
export const msPerYear = msPerDay * 365;

export const strcat = (los: string[], delimiter = " "): string =>
  los.filter(s => !!s).join(delimiter);

export const toTime = (d: DateString): number => new Date(d).getTime();

export const before = (d1: DateString, d2: DateString): boolean => toTime(d1) < toTime(d2);
export const after = (d1: DateString, d2: DateString): boolean => toTime(d1) > toTime(d2);

export const isBusinessExpense = (row: TaxRow): boolean =>
  row.action === TaxActions.Expense
    && row.tag
    && Object.keys(BusinessExpenseTypes).some(t => row.tag.expenseType === t);

export const isLongTermTrade = (row: TaxRow): boolean =>
  toTime(row.date) - toTime(row.receiveDate) > msPerYear;

export const isShortTermTrade = (row: TaxRow): boolean =>
  toTime(row.date) - toTime(row.receiveDate) > msPerYear;

export const getRowTotal = (
  rows: TaxRows,
  filterAction?: string,
  filterTag?: Tag,
  mapRow?: (row) => DecString,
) => 
  rows.filter(row =>
    !filterAction || filterAction === row.action
  ).filter(row =>
    Object.keys(filterTag || {}).every(tagType => row.tag[tagType] === filterTag[tagType])
  ).reduce((tot, row) => (
    math.add(tot, math.mul(
      mapRow ? mapRow(row) : row.value,
      row.tag.multiplier || "1",
    ))
  ), "0");

export const getTotalValue = (rows: TaxRows, filterAction?: string, filterTag?: Tag) =>
  getRowTotal(rows, filterAction || "", filterTag || {}, row => row.value);

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

// Sum up all income & subtract business expenses & income adjustments
export const getTaxableIncome = (rows, filingStatus) => {
  const businessIncome = math.subToZero(
    getRowTotal(
      rows,
      TaxActions.Income,
      { incomeType: IncomeTypes.Business }
    ),
    getRowTotal(rows.filter(isBusinessExpense)),
  );
  const totalIncome = math.add(
    // all non-business income
    getRowTotal(
      rows,
      TaxActions.Income,
      {},
      row => row.tag.incomeType === IncomeTypes.Business ? "0" : row.value
    ),
    businessIncome,
    // need to cut losses off at -1500/-3000 a la f1040sd.L21 (what was last year's filing status?)
    math.max(
      getRowTotal(
        rows,
        TaxActions.Trade,
        {},
        row => row.capitalChange
      ),
      filingStatus === FilingStatuses.Separate ? "-1500" : "-3000",
    ),
  );
  // We should extract & properly label some of these magic numbers
  // as per f1040sse.L4a
  const subjectToSS = math.mul(businessIncome, "0.9235");
  const seAdjustment = math.mul(
    math.add(
      math.mul( // as per f1040sse.L10
        // as per f1040sse.L10
        math.min(subjectToSS, "137700"),
        "0.124",
      ),
      // as per f1040sse.L11
      math.mul(subjectToSS, "0.029"),
    ),
    "0.5", // as per f1040sse.L13
  );
  const standardDeduction = !filingStatus ? ""
    : (filingStatus === FilingStatuses.Single || filingStatus === FilingStatuses.Separate) ? "12200"
    : (filingStatus === FilingStatuses.Joint || filingStatus === FilingStatuses.Widow) ? "24400"
    : (filingStatus === FilingStatuses.Head) ? "18350"
    : "";
  return math.sub(
    totalIncome,
    math.add( // add other adjustments from f1040s1 L22 & qualified business income deduction
      seAdjustment,
      standardDeduction, // what if our filing status was different last year?
    ),
  );
};
