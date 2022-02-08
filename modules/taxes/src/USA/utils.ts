import {
  BusinessExpenseTypes,
  ExpenseType,
  IncomeType,
  IncomeTypes,
} from "@valuemachine/transactions";
import {
  DateString,
  DecString,
  IntString,
  Year,
} from "@valuemachine/types";
import { math } from "@valuemachine/utils";

import {
  FilingStatuses,
  TaxActions,
} from "../enums";
import {
  FilingStatus,
  TaxInput,
  TaxRow,
  TaxRows,
} from "../types";
import {
  after,
  before,
  daysInYear,
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

export {
  ExpenseType,
  ExpenseTypes,
  IncomeType,
  IncomeTypes,
  BusinessExpenseTypes,
} from "@valuemachine/transactions";
export { chrono, math } from "@valuemachine/utils";

export * from "../utils";
export * from "./constants";

export {
  FilingStatuses,
  TaxActions,
} from "../enums";
export { TaxYears } from "../mappings";

export {
  TaxInput,
  TaxRow,
  TaxRows,
} from "../types";

const { Single, Separate, Joint, Head, Widow } = FilingStatuses;

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
// Trades

export const isLongTermTrade = (row: TaxRow): boolean =>
  toTime(row.date) - toTime(row.receiveDate) > msPerYear;

export const isShortTermTrade = (row: TaxRow): boolean =>
  toTime(row.date) - toTime(row.receiveDate) <= msPerYear;

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
    input.personal?.filingStatus === Separate ? "-1500.0" : "-3000.0",
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

// get total non-business income
export const getNonBusinessIncome = (year: Year, rows: TaxRows) =>
  sumRows(rows.filter(row =>
    row.taxYear === `${USA}${year}`
    && row.action === TaxActions.Income
    && row.tag.incomeType
    && row.tag.incomeType !== IncomeTypes.Business
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
  // If we've spent too few days abroad, we ought to just return zero here
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
      getNonBusinessIncome(year, rows),
      getTotalCapitalChange(year, input, rows),
    ),
    getForeignEarnedIncomeExclusion(year, input, rows),
  );

////////////////////////////////////////
// Tax

export const getSelfEmploymentTax = (year: Year, rows: TaxRows): DecString => {
  // We should extract & properly label some of these magic numbers
  const subjectToSS = math.mul(
    getNetBusinessIncome(year, rows),
    "0.9235",
  ); // a la f1040sse.L4a
  return math.add(
    math.mul( 
      math.min(subjectToSS, "137700.0"), // a la f1040sse.L10
      "0.124", // a la f1040sse.L10
    ),
    math.mul(subjectToSS, "0.029"), // a la f1040sse.L11
  );
};

export const getSelfEmploymentAdjustment = (
  year: Year,
  rows: TaxRows,
): DecString =>
  math.mul(
    getSelfEmploymentTax(year, rows),
    "0.5", // a la f1040sse.L13
  );

export const getStandardDeduction = (input: TaxInput) => {
  const filingStatus = input.personal?.filingStatus;
  const stdDeduction =
    (filingStatus === Joint || filingStatus === Widow) ? "24400.0"
    : (filingStatus === Head) ? "18350.0"
    : "12200.0";
  return stdDeduction;
};

// Add any newly supported adjustments here
export const getTotalIncomeAdjustments = (year: Year, rows: TaxRows) =>
  getSelfEmploymentAdjustment(year, rows);

// Combine all income & adjustments
export const getTotalGrossIncome = (year: Year, input: TaxInput, rows: TaxRows) =>
  math.sub(
    getTotalIncome(year, input, rows),
    getTotalIncomeAdjustments(year, rows),
  );

// And any newly supported deductions here
export const getTotalDeductions = (input: TaxInput) =>
  getStandardDeduction(input);

// combine all income & adjustments & deductions
export const getTotalTaxableIncome = (year: Year, input: TaxInput, rows: TaxRows) =>
  math.subToZero(
    getTotalGrossIncome(year, input, rows),
    getTotalDeductions(input),
  );

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
      filingStatus === Single || filingStatus === Separate
    ) ? bracket.single : (
        filingStatus === Joint || filingStatus === Widow
      ) ? bracket.joint : (
          filingStatus === Head
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
  const getIncome = (incomeType: IncomeType, exempt?: boolean): DecString =>
    sumIncome(year, rows.filter(row => !exempt || row.tag.exempt === exempt), incomeType);
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
  } else if (math.gt(exemptDividends, "0")) {
    console.warn(`NOT_IMPLEMENTED: Qualified Dividends and Capital Gain Tax Worksheet`);
  } else if (!math.eq(capGains, "0")) {
    const ws = {} as any; // Schedule D Tax Worksheet on i1040sd pg 16
    ws.L1 = getTotalTaxableIncome(year, input, rows);
    ws.L2 = getIncome(IncomeTypes.Dividend, true);
    ws.L3 = "0"; // TODO: f4952 stuff
    ws.L4 = "0"; // TODO: f4952 stuff
    ws.L5 = math.subToZero(ws.L3, ws.L4);
    ws.L6 = math.subToZero(ws.L2, ws.L5);
    ws.L7 = math.min(
      getTotalCapitalChange(year, input, rows), // f1040sd.L16
      sumLongTermTrades(year, rows, row => row.capitalChange), // f1040sd.L15 (TODO: carryover)
    );
    ws.L8 = math.min(ws.L3, ws.L4);
    ws.L9 = math.subToZero(ws.L7, ws.L8);
    ws.L10 = math.add(ws.L6, ws.L9);
    ws.L11 = "0"; // TODO add 28% rate gain & unrecaptured gains worksheet values
    ws.L12 = math.min(ws.L9, ws.L11);
    ws.L13 = math.sub(ws.L10, ws.L12);
    ws.L14 = math.subToZero(ws.L1, ws.L13);
    ws.L15 = !filingStatus ? "0"
      : (filingStatus === Single || filingStatus === Separate) ? "40400"
      : (filingStatus === Joint || filingStatus === Widow) ? "80800"
      : (filingStatus === Head) ? "54100"
      : "0";
    ws.L16 = math.min(ws.L1, ws.L15);
    ws.L17 = math.min(ws.L14, ws.L16);
    ws.L18 = math.subToZero(ws.L1, ws.L10);
    ws.L19 = math.min(
      ws.L1,
      (filingStatus === Single || filingStatus === Separate) ? "164925"
      : (filingStatus === Joint || filingStatus === Widow) ? "329850"
      : (filingStatus === Head) ? "164900"
      : "0",
    );
    ws.L20 = math.min(ws.L14, ws.L19);
    ws.L21 = math.max(ws.L18, ws.L20);
    ws.L22 = math.sub(ws.L16, ws.L17);
    if (!math.eq(ws.L1, ws.L16)) {
      ws.L23 = math.min(ws.L1, ws.L13);
      ws.L24 = ws.L22;
      ws.L25 = math.subToZero(ws.L23, ws.L24);
      ws.L26 = !filingStatus ? "0"
        : filingStatus === Single ? "445850"
        : filingStatus === Separate ? "250800"
        : (filingStatus === Joint || filingStatus === Widow) ? "501800"
        : (filingStatus === Head) ? "473750"
        : "0";
      ws.L27 = math.min(ws.L1, ws.L26);
      ws.L28 = math.add(ws.L21, ws.L22);
      ws.L29 = math.subToZero(ws.L27, ws.L28);
      ws.L30 = math.min(ws.L25, ws.L29);
      ws.L31 = math.mul(ws.L30, "0.15");
      ws.L32 = math.add(ws.L24, ws.L30);
      if (!math.eq(ws.L1, ws.L32)) {
        ws.L33 = math.sub(ws.L23, ws.L32);
        ws.L34 = math.mul(ws.L33, "0.20");
        // TODO: handle case where f1040sd.L18 or L19 is nonzero
        ws.L41 = math.add(ws.L21, ws.L22, ws.L30, ws.L33, ws.L39);
        ws.L42 = math.sub(ws.L1, ws.L41);
        ws.L43 = math.mul(ws.L42, "0.28");
      }
    }
    ws.L44 = applyTaxBracket(year, ws.L21, filingStatus);
    ws.L45 = math.add(ws.L31, ws.L34, ws.L40, ws.L43, ws.L44);
    ws.L46 = applyTaxBracket(year, ws.L1, filingStatus);
    ws.L47 = math.min(ws.L45, ws.L46);
    return ws.L47;
  }
  return applyTaxBracket(year, getTotalTaxableIncome(year, input, rows), filingStatus);
};

export const getTotalTax = (year: Year, input: TaxInput, rows: TaxRows): DecString =>
  math.add(
    getIncomeTax(year, input, rows),
    getSelfEmploymentTax(year, rows),
  );
