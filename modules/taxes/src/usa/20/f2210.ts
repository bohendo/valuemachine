import {
  ExpenseTypes,
  IncomeTypes,
  Logger,
  TaxActions,
  TaxInput,
  TaxRow,
} from "@valuemachine/types";

import {
  Forms,
  getIncomeTax,
  getTotalValue,
  isBusinessExpense,
  math,
  chrono,
  strcat,
  thisYear,
  msPerDay,
  toTime,
} from "./utils";

export const f2210 = (
  forms: Forms,
  input: TaxInput,
  taxRows: TaxRow[],
  logger: Logger,
): Forms => {
  const log = logger.child({ module: "f2210" });
  const { f1040, f1040s2, f1040s3, f2210 } = forms;
  const personal = input.personal || {};

  f2210.Name = strcat([personal.firstName, personal.lastName]);
  f2210.SSN = personal.SSN;

  ////////////////////////////////////////
  // Part I

  f2210.L1 = f1040.L22;

  f2210.L2 = math.add(
    f1040s2.L4,  // se tax
    f1040s2.L5,  // medicare/social security tax
    f1040s2.L6,  // retirement plan tax
    f1040s2.L7a, // household employment tax from f1040sh
    f1040s2.L7b, // repayment of first time homeowner credit
    f1040s2.L8,  // other taxes from f8959, f8960, etc
  );

  if (math.gt(f1040s2.L8, "0") || math.gt(f1040s2.L7a, "0")) {
    log.warn(`Read instructions & verify value on f2210.L2`);
  }

  f2210.L3 = math.add(
    f1040s3.L8,   // net premium tax credit
    f1040s3.L9,   // payment w request for extension
    f1040s3.L10,  // excess social security credit
    f1040s3.L11,  // fuel tax credit
    f1040s3.L12f, // sum of other credits from f2439, f1040sh, f7202, f8885, etc
  );

  f2210.L4 = math.sub(
    math.add(
      f2210.L1, // total tax after credits
      f2210.L2, // other taxes
    ),
    f2210.L3, // total refundable tax credits
  );

  if (math.lt(f2210.L4, "1000")) {
    log.info(`No penalty required, not filing form 2210: f2210.L4=${f2210.L4} < 1000`);
    delete forms.f2210;
    return forms;
  }

  f2210.L5 = math.mul(f2210.L4, "0.90");

  f2210.L6 = math.add(f1040.L25d, f1040s3.L10);

  f2210.L7 = math.sub(f2210.L4, f2210.L6);

  if (math.lt(f2210.L7, "1000")) {
    log.info(`No penalty required, not filing form 2210: f2210.L7=${f2210.L7} < 1000`);
    delete forms.f2210;
    return forms;
  }

  // TODO: recalculate last year's values?
  const lastYearReturn = {
    f1040: {
      L14: "0",
    },
    f1040s2: {
      L4: "10939.09",
      L6: "0",
      L7a: "0",
      L7b: "0",
      L8: "0",
    },
  } as any; // Last year's tax return
  f2210.L8 = math.add(
    lastYearReturn.f1040?.L14,   // total tax (except se, etc) - total credits
    lastYearReturn.f1040s2?.L4,  // se tax from f1040sse L5
    lastYearReturn.f1040s2?.L6,  // tax on retirement fund distributions from f5329
    lastYearReturn.f1040s2?.L7a, // household employment tax from f1040sh
    lastYearReturn.f1040s2?.L7b, // repayment of first time homeowner credit from f5404
    lastYearReturn.f1040s2?.L8,  // other taxes from f8959, f8960, etc
  );

  if ("f5329" in forms) log.warn(`NOT_IMPLEMENTED: add 2019 f5329 tax to f2210.L8`);
  if ("f1040sh" in forms) log.warn(`NOT_IMPLEMENTED: add 2019 f1040sh tax to f2210.L8`);
  if ("f5404" in forms) log.warn(`NOT_IMPLEMENTED: add 2019 f5404 tax to f2210.L8`);
  if ("f8959" in forms) log.warn(`NOT_IMPLEMENTED: add 2019 f8959 tax to f2210.L8`);
  if ("f8960" in forms) log.warn(`NOT_IMPLEMENTED: add 2019 f8960 tax to f2210.L8`);

  f2210.L9 = math.min(f2210.L5, f2210.L8);

  ////////////////////////////////////////
  // Part II

  if (math.gt(f2210.L8, f2210.L5)) {
    f2210.CE = false;
  }

  if (!f2210.CA && !f2210.CB && !f2210.CC && !f2210.CD && !f2210.CE) {
    f2210.CC = true;
    log.info(`Assuming that our penalty would be lower if properly calculated...`);
  }

  if (math.gt(f2210.L9, f2210.L6)) {
    f2210.C9_Yes = true;
    if ((f2210.CA || f2210.CE) && !f2210.CB && !f2210.CC && !f2210.CD) {
      log.info(`No figuring penalty, filing only page 1 of form 2210`);
      return forms;
    }
  } else {
    f2210.C9_No = true;
    if (!f2210.CE) {
      log.info(`No penalty required, not filing form 2210`);
      delete forms.f2210;
      return forms;
    }
    if (!f2210.CB && !f2210.CC && !f2210.CD) {
      log.info(`No figuring penalty, filing only page 1 of form 2210`);
      return forms;
    }
  }

  ////////////////////////////////////////
  // Schedule AI - Annualized Income Installment Method

  const columns = ["a", "b", "c", "d"];

  const marToDec = row => {
    const time = toTime(row.date);
    return time >= toTime("2020-03-27") && time < toTime("2020-12-31");
  };

  const getRangeFilter = cutoff => row => {
    const time = toTime(row.date);
    return time >= toTime("2020-01-01") && time < toTime(cutoff);
  };

  const inRange = {
    a: getRangeFilter("2020-03-31"),
    b: getRangeFilter("2020-05-31"),
    c: getRangeFilter("2020-08-31"),
    d: getRangeFilter("2020-12-31"),
  };

  const P = math.div(
    getTotalValue(
      taxRows.filter(marToDec),
      TaxActions.Income,
      { incomeType: IncomeTypes.Business },
    ),
    getTotalValue(
      taxRows.filter(thisYear),
      TaxActions.Income,
      { incomeType: IncomeTypes.Business },
    ),
  );
  log.info(`Proportion of se income earned from Mar27-Dec31: ${P.substring(0, 5)}%`);

  const L32 = {
    a: math.mul("0.4960", math.sub("1", math.mul(P, "0.5"))),
    b: math.mul("0.2976", math.sub("1", math.mul(P, "0.5"))),
    c: math.mul("0.1860", math.sub("1", math.mul(P, "0.5"))),
    d: math.mul("0.1240", math.sub("1", math.mul(P, "0.5"))),
  };

  const preFilled = {
    L2: { a: "4", b: "2.4", c: "1.5", d: "1" },
    L5: { a: "4", b: "2.4", c: "1.5", d: "1" },
    L20: { a: "0.225", b: "0.45", c: "0.675", d: "0.90" },
    L29: { a: "34425", b: "57375", c: "91800", d: "137700" },
    L32: { a: L32.a, b: L32.b, c: L32.c, d: L32.d },
    L34: { a: "0.116", b: "0.0696", c: "0.0435", d: "0.029" },
  };

  columns.forEach(column => {
    const Q = `Q${columns.indexOf(column)+1}`;

    const getKey = (row: number): string =>
      `aiL${row}${column}`;

    const getVal = (row: number): string =>
      preFilled[`L${row}`] ? preFilled[`L${row}`][column] : f2210[getKey(row)];

    const getPrevVal = (row: number): string =>
      f2210[`aiL${row}${columns[columns.indexOf(column) - 1]}`];

    const rowsInRange = taxRows.filter(inRange[column]);
    log.info(`Got ${rowsInRange.length} tax rows for ${Q}`);

    const wageIncome = getTotalValue(
      rowsInRange,
      TaxActions.Income,
      { incomeType: IncomeTypes.Wage },
    );

    const seIncome = getTotalValue(
      rowsInRange,
      TaxActions.Income,
      { incomeType: IncomeTypes.Business },
    );

    const businessExpenses = getTotalValue(
      rowsInRange.filter(isBusinessExpense),
    );

    log.info(`${Q}: seIncome=${seIncome} | expenses=${businessExpenses} | wageIncome=${wageIncome}`);

    ////////////////////////////////////////
    // Schedule AI Part II - Annualized Self-Employment Tax

    f2210[getKey(28)] = math.mul(
      math.sub(seIncome, businessExpenses),
      "0.9235",
    );

    f2210[getKey(30)] = wageIncome;

    if ("f4137" in forms || "f8919" in forms) {
      log.warn(`See instructions & verify value on line ${getKey(30)}`);
    }

    f2210[getKey(31)] = math.subToZero(getVal(29), getVal(30));

    f2210[getKey(32)] = getVal(32);

    f2210[getKey(33)] = math.mul(math.min(getVal(28), getVal(31)), getVal(32));

    f2210[getKey(35)] = math.mul(getVal(28), getVal(34));

    f2210[getKey(36)] = math.add(getVal(33), getVal(35));

    ////////////////////////////////////////
    // Schedule AI Part I - Annualized Income Installments

    const subjectToSS = math.mul(
      math.sub(seIncome, businessExpenses),
      "0.9235", // as per f1040sse.L4a
    );
    log.info(`SE Income subject to SS for ${Q}: ${subjectToSS}`);

    const seAdjustment = math.mul(
      math.add(
        math.mul(
          math.min(
            subjectToSS,
            "137700", // as per f1040sse.L10
          ),
          "0.124", // as per f1040sse.L10
        ),
        math.mul(
          subjectToSS,
          "0.029", // as per f1040sse.L11
        ),
      ),
      "0.5", // as per f1040sse.L13
    );
    log.info(`SE Adjustment for ${Q}: ${seAdjustment} (total adjustment=${forms.f1040s1.L14})`);

    f2210[getKey(1)] = math.subToZero(seIncome, seAdjustment);
    log.info(`Adjusted Income for ${Q}: ${f2210[getKey(1)]}`);

    f2210[getKey(3)] = math.mul(getVal(1), getVal(2));

    f2210[getKey(4)] = "0";

    f2210[getKey(6)] = math.mul(getVal(4), getVal(5));

    f2210[getKey(7)] = f1040.L12;

    f2210[getKey(8)] = math.max(getVal(6), getVal(7));

    if ("f8995" in forms) {
      log.warn(`NOT_IMPLEMENTED: f2210.${getKey(9)}`);
    } else {
      f2210[getKey(9)] = "0";
    }

    f2210[getKey(10)] = math.add(getVal(8), getVal(9));

    f2210[getKey(11)] = math.subToZero(getVal(3), getVal(10));

    f2210[getKey(12)] = "0"; // if estate/trust then do something else

    f2210[getKey(13)] = math.subToZero(getVal(11), getVal(12));

    f2210[getKey(14)] = getIncomeTax(getVal(13), personal.filingStatus);

    f2210[getKey(15)] = getVal(36);

    f2210[getKey(16)] = math.div(math.sub(f2210.L2, f1040s2.L4), getVal(2));

    f2210[getKey(17)] = math.add(getVal(14), getVal(15), getVal(16));

    f2210[getKey(18)] = math.div(f2210.L3, getVal(2));

    f2210[getKey(19)] = math.subToZero(getVal(17), getVal(18));

    f2210[getKey(21)] = math.mul(getVal(20), getVal(19));

    if (column === "b") {
      f2210[getKey(22)] = f2210.aiL27a;
    } else if (column === "c") {
      f2210[getKey(22)] = math.add(f2210.aiL27a, f2210.aiL27b);
    } else if (column === "d") {
      f2210[getKey(22)] = math.add(f2210.aiL27a, f2210.aiL27b, f2210.aiL27c);
    }

    if (column === "a") {
      f2210[getKey(23)] = getVal(21);
    } else {
      f2210[getKey(23)] = math.subToZero(getVal(21), getVal(22));
    }

    f2210[getKey(24)] = math.mul(f2210.L9, "0.25");

    f2210[getKey(25)] = math.sub(getPrevVal(26), getPrevVal(27));

    f2210[getKey(26)] = math.add(getVal(24), getVal(25));

    f2210[getKey(27)] = math.min(getVal(23), getVal(26));

    log.info(`Required installment for ${Q}: ${getVal(27)}`);
  });

  log.info(`Done with Schedule AI`);

  ////////////////////////////////////////
  // F2210 Part IV - The Regular Method

  f2210.L18a = math.add(f2210.aiL27a, f2210.aiL27b);
  f2210.L18c = f2210.aiL27c;
  f2210.L18d = f2210.aiL27d;

  const moreRanges = {
    a: getRangeFilter("2020-01-15"),
    c: getRangeFilter("2020-09-15"),
    d: getRangeFilter("2021-01-15"),
  };

  columns.forEach(column => {
    if (column === "b") return;
    const getKey = (row: number): string => `L${row}${column}`;
    const getVal = (row: number): string => f2210[getKey(row)];
    const getPrevVal = (row: number): string =>
      f2210[`L${row}${columns[columns.indexOf(column) - 1]}`];

    f2210[getKey(19)] = getTotalValue(
      taxRows.filter(moreRanges[column]),
      TaxActions.Expense,
      { expenseType: ExpenseTypes.Tax },
    );

    if (column === "a") {
      f2210[getKey(23)] = getVal(19);
    } else {
      f2210[getKey(20)] = getPrevVal(26);
      f2210[getKey(21)] = math.add(getVal(19), getVal(20));
      f2210[getKey(22)] = math.add(getPrevVal(24), getPrevVal(25));
      f2210[getKey(23)] = math.subToZero(getVal(21), getVal(22));
      f2210[getKey(24)] = math.eq(getVal(23), "0") ? math.sub(getVal(22), getVal(21)) : "0";
    }

    f2210[getKey(25)] = math.subToZero(getVal(18), getVal(23));
    f2210[getKey(26)] = math.subToZero(getVal(23), getVal(18));
    log.info(`Col ${column} Underpayment=${f2210[getKey(25)]} | Overpayment=${f2210[getKey(26)]}`);
  });

  ////////////////////////////////////////
  // F2210 Worksheet Section B - Figure the Penalty

  let penalty = "0"; 

  const dueLabel = {
    a: "Q1",
    b: "Q2",
    c: "Q3",
    d: "Q4",
  };

  const allPayments = taxRows.filter(row =>
    row.action === TaxActions.Expense && row.tag.expenseType === ExpenseTypes.Tax
  ).sort(chrono).map(row => ({ date: toTime(row.date), value: row.value }));

  columns.forEach(column => {
    if (column === "b") return;

    const underpayment = f2210[`L25${column}`]; // Total underpayment on L1a
    const payments = []; // Payments on L1b

    log.info(`Underpayment for period ${column}: ${underpayment}`);

    let togo = f2210[`L18${column}`];
    while (math.gt(togo, "0")) {
      const payment = allPayments.shift();
      log.info(`Processing payment: ${JSON.stringify(payment)}`);
      if (!payment) {
        payments.push({
          date: Date.now(),
          value: togo,
        });
        log.warn(`You didn't make enough payments.. Assuming you pay $${togo} today..`);
        break;
      } else if (math.gt(payment.value, togo)) {
        log.debug(`Applying part of payment & we're done: ${JSON.stringify(payment)}`);
        payment.value = math.sub(payment.value, togo);
        allPayments.unshift(payment); // put the rest of this payment back
        payments.push({
          date: payment.date,
          value: togo,
        });
        togo = "0";
      } else {
        log.debug(`Applying entire payment & getting the next one: ${JSON.stringify(payment)}`);
        togo = math.sub(togo, payment.value);
        payments.push(payment);
      }
    }

    if (!math.eq(togo, "0")) {
      log.warn(`After all payments made, still ${togo} to go`);
    }

    const getPenalty = (startDate, endDate, q) => {
      const daysDiff = (t1, t2) => Math.round(Math.abs(t1 - t2) / msPerDay);
      const rate = "0.03";
      const days = [];
      const penalties = [];
      let total = "0";
      payments.forEach(payment => {
        const diff = daysDiff(Math.min(payment.date, endDate), startDate);
        const amt = math.mul(underpayment, (diff / 365).toString(), rate);
        days.push(diff);
        penalties.push(amt);
        total = math.add(total, amt);
      });
      log.info(`Penalty owed for ${dueLabel[column]} taxes in ${q}: daysLate=[${
        days
      }] * ${rate} => penalties=[${penalties}] => total=${total}`);
      return total;
    };

    if (column === "a" || column === "c") {
      // Rate Period 2
      penalty = math.add(penalty, getPenalty(
        column === "a" ? toTime("2020-07-15") : toTime("2020-09-15"),
        toTime("2020-09-30"),
        "Q3",
      ));
      // Rate Period 3
      penalty = math.add(penalty, getPenalty(
        toTime("2020-09-30"),
        toTime("2020-12-31"),
        "Q4",
      ));
    }
    // Rate Period 4
    penalty = math.add(penalty, getPenalty(
      column === "d" ? toTime("2021-01-15") : toTime("2020-12-31"),
      toTime("2021-04-15"),
      "Q5",
    ));

  }); 

  log.info(`Total Penalty: ${penalty}`);

  f2210.L27 = penalty;
  f1040.L38 = penalty;

  return { ...forms, f2210, f1040 };
};
