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
  TaxInput,
  TaxRow,
  TaxRows,
  Year,
} from "@valuemachine/types";
import { math } from "@valuemachine/utils";

import {
  after,
  before,
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
// String

export const strcat = (los: string[], delimiter = " "): string =>
  los.filter(s => !!s).join(delimiter);

////////////////////////////////////////
// Util

export const getTotalValue = (rows: TaxRows, filterAction?: string, filterTag?: Tag) =>
  getRowTotal(rows, filterAction || "", filterTag || {}, row => row.value);

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

////////////////////////////////////////
// Date

// ISO => "MM, DD, YY"
export const toFormDate = (date: DateString): string => {
  const pieces = date.split("T")[0].split("-");
  return `${pieces[1]}, ${pieces[2]}, ${pieces[0]}`;
};

export const daysInYear = (year: Year): IntString => {
  const y = parseInt(year);
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? "366" : "365";
};

////////////////////////////////////////
// Expense

export const isBusinessExpense = (row: TaxRow): boolean =>
  row.action === TaxActions.Expense
    && row.tag
    && Object.keys(BusinessExpenseTypes).some(t => row.tag.expenseType === t);

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

// cut capital losses off at -1500/-3000 a la f1040sd.L21
export const getTotalCapitalChange = (input: TaxInput, rows: TaxRows) =>
  math.max(
    getRowTotal(
      rows,
      TaxActions.Trade,
      {},
      row => row.capitalChange
    ),
    input.personal?.filingStatus === FilingStatuses.Separate ? "-1500" : "-3000",
  );

////////////////////////////////////////
// Income

// Gross business income minus deductible expenses
export const getBusinessIncome = (rows) =>
  math.subToZero(
    getRowTotal(
      rows,
      TaxActions.Income,
      { incomeType: IncomeTypes.Business }
    ),
    getRowTotal(rows.filter(isBusinessExpense)),
  );

// Gross business income minus deductible expenses
export const getGetForeignEarnedIncome = (year: Year) => {
  const [yearStart, yearEnd] = [`${year}-01-01`, `${year}-12-31`];
  return (input: TaxInput, rows: TaxRows) => {
    const travel = getTravel(input, yearStart, yearEnd);
    const outOfUSA = row => !travel.find(trip =>
      trip.country === USA
      && before(trip.enterDate, row.date)
      && after(trip.leaveDate, row.date)
    );
    const foreignRows = rows.filter(outOfUSA).filter(row => row.date.startsWith(year));
    return math.add(
      getTotalValue(foreignRows, TaxActions.Income, { incomeType: IncomeTypes.Wage }),
      math.subToZero(
        getTotalValue(foreignRows, TaxActions.Income, { incomeType: IncomeTypes.Business }),
        getTotalValue(foreignRows.filter(isBusinessExpense)),
      ),
    );
  };
};

export const getGetForeignEarnedIncomeExclusion = (year: Year) => {
  const [yearStart, yearEnd] = [`${year}-01-01`, `${year}-12-31`];
  const getForeignEarnedIncome = getGetForeignEarnedIncome(year);
  return (input: TaxInput, rows: TaxRows) => {
    const income = getForeignEarnedIncome(input, rows);
    const percentDaysAbroad = math.div(
      getDaysAbroad(input, yearStart, yearEnd),
      daysInYear(year),
    );
    return math.min(
      income,
      math.mul(getMaxFeie(year), percentDaysAbroad),
    );
  };
};

// net business income + applicable capital change + other income - feie
export const getGetTotalIncome = (year: Year) => {
  const getForeignEarnedIncome = getGetForeignEarnedIncome(year);
  return (input: TaxInput, rows: TaxRows) =>
    math.sub(
      math.add(
        getBusinessIncome(rows),
        // get total non-business income
        getRowTotal(
          rows,
          TaxActions.Income,
          {},
          row => row.tag.incomeType === IncomeTypes.Business ? "0" : row.value
        ),
        getTotalCapitalChange(input, rows),
      ),
      getForeignEarnedIncome(input, rows),
    );
};

// combine all income & adjustments
export const getGetTotalTaxableIncome = (year: Year) => {
  const getTotalIncome = getGetTotalIncome(year);
  return (input: TaxInput, rows: TaxRows) => {
    // We should extract & properly label some of these magic numbers
    // as per f1040sse.L4a
    const subjectToSS = math.mul(getBusinessIncome(rows), "0.9235");
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
    const filingStatus = input.personal?.filingStatus;
    const standardDeduction = !filingStatus ? "0"
      : (filingStatus === FilingStatuses.Single || filingStatus === FilingStatuses.Separate) ? "12200"
      : (filingStatus === FilingStatuses.Joint || filingStatus === FilingStatuses.Widow) ? "24400"
      : (filingStatus === FilingStatuses.Head) ? "18350"
      : "0";
    return math.subToZero(
      getTotalIncome(input, rows),
      math.add( // add other adjustments from f1040s1 L22 & qualified business income deduction
        seAdjustment,
        standardDeduction, // what if our filing status was different last year?
      ),
    );
  };
};

////////////////////////////////////////
// Tax

export const getGetIncomeTax = (year: Year) => {
  const taxBrackets = getTaxBrackets(year);
  return (
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
};

export const getTotalTax = (rows, input) =>
  rows ? "0" : input ? "0" : "0";
