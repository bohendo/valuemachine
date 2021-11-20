import {
  BusinessExpenseTypes,
  DateString,
  IncomeType,
  ExpenseType,
  DecString,
  FilingStatus,
  FilingStatuses,
  IncomeTypes,
  IntString,
  TaxActions,
  TaxInput,
  TaxRow,
  TaxRows,
  Year,
} from "@valuemachine/types";
import { math } from "@valuemachine/utils";

import {
  after,
  before,
  daysInYear,
  getRowTotal,
  getTotalValue,
  sumRows,
  toTime,
} from "../utils";

import {
  getMaxFeie,
  getTaxBrackets,
  msPerDay,
  msPerYear,
  USA,
} from "./constants";

export * from "../utils";
export * from "./constants";

export { chrono, math } from "@valuemachine/utils";

export { TaxYears } from "../mappings";

////////////////////////////////////////
// Date

// ISO => "MM, DD, YY"
export const toFormDate = (date: DateString): string => {
  const pieces = date.split("T")[0].split("-");
  return `${pieces[1]}, ${pieces[2]}, ${pieces[0]}`;
};

////////////////////////////////////////
// Expense

////////////////////////////////////////
// Travel

export const diffDays = (d1: DateString, d2: DateString): IntString =>
  Math.trunc(Math.abs(
    new Date(`${d1}T00:00:00Z`).getTime() - new Date(`${d2}T00:00:00Z`).getTime()
  ) / msPerDay).toString();

export const getTravel = (input: TaxInput, start: DateString, end: DateString) => {
  const [s, e] = [toTime(start), toTime(end)];
  return (input.travel || []).reduce((trips, trip) => {
    const t = { s: toTime(trip.enterDate), e: toTime(trip.leaveDate) };
    if (t.s > e || t.e < s) return trips;
    return trips.concat({
      ...trip,
      enterDate: t.s > s ? trip.enterDate : start,
      leaveDate: t.e < e ? trip.leaveDate : end,
    });
  }, [] as any[]);
};

export const getDaysByCountry = (input: TaxInput, start: DateString, end: DateString) => {
  const travel = getTravel(input, start, end);
  return travel.reduce((days, trip) => ({
    ...days,
    [trip.country]: math.add(days[trip.country] || "0", diffDays(trip.enterDate, trip.leaveDate))
  }), {});
};

export const getDaysAbroad = (input: TaxInput, start: DateString, end: DateString) => {
  const daysInEachCountry = getDaysByCountry(input, start, end);
  return Object.keys(daysInEachCountry).reduce((tot, country) => {
    return country !== USA ? math.add(tot, daysInEachCountry[country]) : tot;
  }, "0");
};

export const outsideUSA = (input, start, end) => {
  const travel = getTravel(input, start, end);
  return (row) =>
    !travel.find(trip =>
      trip.country === USA
      && before(trip.enterDate, row.date)
      && after(trip.leaveDate, row.date)
    );
};

////////////////////////////////////////
// Capital

export const isLongTermTrade = (row: TaxRow): boolean =>
  toTime(row.date) - toTime(row.receiveDate) > msPerYear;

export const isShortTermTrade = (row: TaxRow): boolean =>
  toTime(row.date) - toTime(row.receiveDate) > msPerYear;

export const getTrades = (year: Year, rows: TaxRows): TaxRows => 
  rows.filter(row =>
    row.taxYear === `${USA}${year}`
    && (row.action === TaxActions.Trade || row.action === TaxActions.Expense)
    && math.gt(math.abs(row.capitalChange), "0.005")
  );

export const sumTrades = (year: Year, rows: TaxRows, map?: (row: TaxRow) => DecString): DecString =>
  sumRows(getTrades(year, rows), map || (row => row.capitalChange));

export const sumShortTermTrades = (year: Year, rows: TaxRows, map?: (row: TaxRow) => DecString) =>
  sumRows(getTrades(year, rows).filter(isShortTermTrade), map || (row => row.capitalChange));

export const sumLongTermTrades = (year: Year, rows: TaxRows, map?: (row: TaxRow) => DecString) =>
  sumRows(getTrades(year, rows).filter(isLongTermTrade), map || (row => row.capitalChange));

// cut capital losses off at -1500/-3000 a la f1040sd.L21
export const getTotalCapitalChange = (year: Year, input: TaxInput, rows: TaxRows) =>
  math.max(
    sumTrades(year, rows, row => row.capitalChange),
    input.personal?.filingStatus === FilingStatuses.Separate ? "-1500" : "-3000",
  );

////////////////////////////////////////
// Expenses

export const isBusinessExpense = (row: TaxRow): boolean =>
  row.action === TaxActions.Expense
    && row.tag
    && Object.keys(BusinessExpenseTypes).some(t => row.tag.expenseType === t);

export const sumExpenses = (
  year: Year,
  rows: TaxRows,
  expenseType: ExpenseType,
  map?: (row: TaxRow) => DecString,
): DecString =>
  sumRows(
    rows.filter(row =>
      row.taxYear === `${USA}${year}`
      && row.action === TaxActions.Expense
      && row.tag.expenseType === expenseType
    ),
    map || (row => row.value)
  );

export const getBusinessExpenses = (
  year: Year,
  rows: TaxRows,
  expenseType?: ExpenseType,
): DecString =>
  sumRows(rows.filter(row =>
    row.taxYear === `${USA}${year}`
    && isBusinessExpense(row)
    && row.action === TaxActions.Expense
    && (!expenseType || expenseType === row.tag.expenseType)
  ).filter(isBusinessExpense));

////////////////////////////////////////
// Income

export const sumIncome = (year: Year, rows: TaxRows, incomeType: IncomeType): DecString =>
  sumRows(rows.filter(row =>
    row.taxYear === `${USA}${year}`
    && row.action === TaxActions.Income
    && row.tag.incomeType === incomeType
  ));

// Gross business income minus deductible expenses
export const getNetBusinessIncome = (year: Year, rows: TaxRows) =>
  math.subToZero(
    sumIncome(year, rows, IncomeTypes.Business),
    getBusinessExpenses(year, rows),
  );

// Gross business income minus deductible expenses
export const getForeignEarnedIncome = (year: Year, input: TaxInput, rows: TaxRows) => {
  const [yearStart, yearEnd] = [`${year}-01-01`, `${year}-12-31`];
  const travel = getTravel(input, yearStart, yearEnd);
  const outOfUSA = row => !travel.find(trip =>
    trip.country === USA
    && before(trip.enterDate, row.date)
    && after(trip.leaveDate, row.date)
  );
  const foreignRows = rows.filter(outOfUSA).filter(row => row.taxYear === `${USA}${year}`);
  return math.add(
    getTotalValue(foreignRows, TaxActions.Income, { incomeType: IncomeTypes.Wage }),
    math.subToZero(
      getTotalValue(foreignRows, TaxActions.Income, { incomeType: IncomeTypes.Business }),
      getTotalValue(foreignRows.filter(isBusinessExpense)),
    ),
  );
};

export const getForeignEarnedIncomeExclusion = (year: Year, input: TaxInput, rows: TaxRows) => {
  const [yearStart, yearEnd] = [`${year}-01-01`, `${year}-12-31`];
  // TODO: If too few days abroad, return zero
  // We could eventually pull housing exclusion info out of tax input here too..
  const income = getForeignEarnedIncome(year, input, rows);
  const percentDaysAbroad = math.div(
    getDaysAbroad(input, yearStart, yearEnd),
    daysInYear(year),
  );
  return math.min(
    income,
    math.mul(getMaxFeie(year), percentDaysAbroad),
  );
};

// net business income + applicable capital change + other income - feie
export const getTotalIncome = (year: Year, input: TaxInput, rows: TaxRows) =>
  math.sub(
    math.add(
      getNetBusinessIncome(year, rows),
      // get total non-business income
      getRowTotal(
        rows,
        TaxActions.Income,
        {},
        row => row.tag.incomeType === IncomeTypes.Business ? "0" : row.value
      ),
      getTotalCapitalChange(year, input, rows),
    ),
    getForeignEarnedIncome(year, input, rows),
  );

////////////////////////////////////////
// Tax

export const getSelfEmploymentTax = (year: Year, input: TaxInput, rows: TaxRows): DecString => {
  // We should extract & properly label some of these magic numbers
  const subjectToSS = math.mul(getNetBusinessIncome(year, rows), "0.9235"); // a la f1040sse.L4a
  return math.add(
    math.mul( 
      math.min(subjectToSS, "137700"), // a la f1040sse.L10
      "0.124", // a la f1040sse.L10
    ),
    math.mul(subjectToSS, "0.029"), // a la f1040sse.L11
  );
};

// combine all income & adjustments
export const getTotalTaxableIncome = (year: Year, input: TaxInput, rows: TaxRows) => {
  const seAdjustment = math.mul(
    getSelfEmploymentTax(year, input, rows),
    "0.5", // a la f1040sse.L13
  );
  const filingStatus = input.personal?.filingStatus;
  const standardDeduction = !filingStatus ? "0"
    : (filingStatus === FilingStatuses.Single || filingStatus === FilingStatuses.Separate) ? "12200"
    : (filingStatus === FilingStatuses.Joint || filingStatus === FilingStatuses.Widow) ? "24400"
    : (filingStatus === FilingStatuses.Head) ? "18350"
    : "0";
  return math.subToZero(
    getTotalIncome(year, input, rows),
    math.add( // add other adjustments from f1040s1 L22 & qualified business income deduction
      seAdjustment,
      standardDeduction, // what if our filing status was different last year?
    ),
  );
};

export const applyTaxBracket = (
  year: Year,
  taxableIncome: DecString,
  filingStatus?: FilingStatus,
): DecString => {
  const taxBrackets = getTaxBrackets(year);
  let incomeTax = "0";
  let prevThreshold = "0";
  taxBrackets.forEach(bracket => {
    const threshold = !filingStatus ? "0" : (
      filingStatus === FilingStatuses.Single || filingStatus === FilingStatuses.Separate
    ) ? bracket.single : (
        filingStatus === FilingStatuses.Joint || filingStatus === FilingStatuses.Widow
      ) ? bracket.joint : (
          filingStatus === FilingStatuses.Head
        ) ? bracket.head : "0";
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

export const getIncomeTax = (year: Year, input: TaxInput, rows: TaxRows): DecString => {
  const feie = getForeignEarnedIncomeExclusion(year, input, rows);
  const exemptDividends = sumIncome(
    year,
    rows.filter(row => row.tag.exempt),
    IncomeTypes.Dividend
  );
  const capGains = getTotalCapitalChange(year, input, rows);
  const filingStatus = input.personal?.filingStatus;
  if (math.gt(feie, "0")) {
    const ws = {} as any; // Foreign Earned Income Tax Worksheet on i1040 pg 35
    ws.L1 = getTotalTaxableIncome(year, input, rows);
    ws.L2a = getForeignEarnedIncomeExclusion(year, input, rows);
    ws.L2b = "0"; // unapplied deducation & exclusions due to foreign earned income exclusion
    ws.L2c = math.subToZero(ws.L2a, ws.L2b);
    ws.L3 = math.add(ws.L1, ws.L2c);
    ws.L4 = applyTaxBracket(year, ws.L3, filingStatus);
    ws.L5 = applyTaxBracket(year, ws.L2c, filingStatus);
    return math.subToZero(ws.L4, ws.L5);
  } else if (math.gt(capGains, "0")) {
    throw new Error(`NOT_IMPLEMENTED: Schedule D Tax Worksheet`);
  } else if (math.gt(exemptDividends, "0")) {
    throw new Error(`NOT_IMPLEMENTED: Qualified Dividends and Capital Gain Tax Worksheet`);
  } else {
    return applyTaxBracket(year, getTotalTaxableIncome(year, input, rows), filingStatus);
  }
};

export const getTotalTax = (year: Year, input: TaxInput, rows: TaxRows): DecString =>
  math.add(
    getIncomeTax(year, input, rows),
    getSelfEmploymentTax(year, input, rows),
  );
