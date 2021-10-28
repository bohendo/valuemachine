import {
  DateString,
  FilingStatuses,
  Forms,
  getIncomeTax,
  logger,
  math,
  processExpenses,
  processIncome,
  TaxRow,
} from "./utils";

const log = logger.child({ module: "f2210" });

export const f2210 = (forms: Forms, taxRows: TaxRow[]): Forms => {
  const { f1040, f1040s2, f1040s3, f1040sse, f2210 } = forms;

  f2210.Name = `${f1040.FirstNameMI} ${f1040.LastName}`;
  f2210.SSN = f1040.SSN;

  ////////////////////////////////////////
  // Part I

  f2210.L1 = f1040.L14;

  f2210.L2 = math.add(f1040s2.L4, f1040s2.L6, f1040s2.L7a, f1040s2.L7b, f1040s2.L8);

  if (math.gt(f1040s2.L8, "0") || math.gt(f1040s2.L7a, "0")) {
    log.warn(`Read instructions & verify value on f2210.L2`);
  }

  f2210.L3 = math.add(f1040s3.L9, f1040s3.L12);

  f2210.L4 = math.sub(math.add(f2210.L1,f2210.L2), f2210.L3);

  if (math.lt(f2210.L4, "1000")) {
    log.info(`No penalty required, not filing form 2210: f2210.L4=${f2210.L4} < 1000`);
    delete forms.f2210;
    return forms;
  }

  f2210.L5 = math.mul(f2210.L4, "0.90");

  f2210.L6 = math.add(f1040.L17, f1040s3.L11);

  f2210.L7 = math.sub(f2210.L4, f2210.L6);

  if (math.lt(f2210.L7, "1000")) {
    log.info(`No penalty required, not filing form 2210`);
    delete forms.f2210;
    return forms;
  }

  if (math.eq(f2210.L8, "0")) {
    log.warn(`Required but not implemented or provided: f2210.L8`);
  }

  f2210.L9 = math.min(f2210.L5, f2210.L8);

  ////////////////////////////////////////
  // Part II

  if (math.gt(f2210.L8, f2210.L5)) {
    f2210.C0_E = false;
  }

  if (!f2210.C0_A && !f2210.C0_B && !f2210.C0_C && !f2210.C0_D && !f2210.C0_E) {
    log.info(`No penalty required, not filing form 2210`);
    delete forms.f2210;
    return forms;
  }

  if (math.gt(f2210.L9, f2210.L6)) {
    f2210.C9_Yes = true;
    if ((f2210.C0_A || f2210.C0_E) && !f2210.C0_B && !f2210.C0_C && !f2210.C0_D) {
      log.info(`No figuring penalty, filing only page 1 of form 2210`);
      return forms;
    }
  } else {
    f2210.C9_No = true;
    if (!f2210.C0_E) {
      log.info(`No penalty required, not filing form 2210`);
      delete forms.f2210;
      return forms;
    }
    if (!f2210.C0_B && !f2210.C0_C && !f2210.C0_D) {
      log.info(`No figuring penalty, filing only page 1 of form 2210`);
      return forms;
    }
  }

  ////////////////////////////////////////
  // Get required info from tax rows

  const columns = ["a", "b", "c", "d"];

  const allPayments = [];
  const expenses = {};
  const income = {};
  const payments = {};

  columns.forEach(col => {
    expenses[col] = "0";
    income[col] = "0";
    payments[col] = "0";
  });

  const getTime = (day: string, month: string, yearDiff = 0): number =>
    new Date(`${new Date().getFullYear() - 1 + yearDiff}-${month}-${day}T00:00:00.000Z`).getTime();

  const getCol = (date: DateString): string => {
    const time = new Date(date).getTime();
    return columns[
      time < getTime("01", "01") ? -1
      : time < getTime("01", "04") ? 0
      : time < getTime("01", "06") ? 1
      : time < getTime("01", "09") ? 2
      : time < getTime("01", "01", +1) ? 3
      : -1
    ];
  };

  // Get income rows
  processIncome(taxRows, (row: TaxRow, value: string): void => {
    income[getCol(row.date)] = math.add(
      income[getCol(row.date)],
      math.round(value),
    );
  });

  // Get business expenses & tax payments
  processExpenses(taxRows, (row: TaxRow, value: string): void => {
    if (row.tags.some(tag => tag.startsWith("f1040sc"))) {
      expenses[getCol(row.date)] = math.add(
        expenses[getCol(row.date)],
        math.round(value),
      );
    } else if (row.tags.includes("f1040s3.L8")) {
      allPayments.push({ date: new Date(row.date).getTime(), value });
      payments[getCol(row.date)] = math.add(
        payments[getCol(row.date)],
        value,
      );
    }
  });

  log.info(`Income: Q1 ${income["a"]} | Q2 ${income["b"]} | Q3 ${income["c"]} | Q4 ${income["d"]}`);
  log.info(`Expenses: Q1 ${expenses["a"]} | Q2 ${expenses["b"]} | Q3 ${expenses["c"]} | Q4 ${expenses["d"]}`);
  log.info(`Payments: Q1 ${payments["a"]} | Q2 ${payments["b"]} | Q3 ${payments["c"]} | Q4 ${payments["d"]}`);

  ////////////////////////////////////////
  // Schedule AI - Annualized Income Installment Method

  const preFilled = {
    L2: { a: "4", b: "2.4", c: "1.5", d: "1" },
    L5: { a: "4", b: "2.4", c: "1.5", d: "1" },
    L20: { a: "0.225", b: "0.45", c: "0.675", d: "0.90" },
    L29: { a: "33225", b: "55375", c: "88600", d: "132900" },
    L32: { a: "0.496", b: "0.2976", c: "0.186", d: "0.124" },
    L34: { a: "0.116", b: "0.0696", c: "0.0435", d: "0.029" },
  };

  columns.forEach(column => {
    const getKey = (row: number): string =>
      `P4L${row}${column}`;

    const getVal = (row: number): string =>
      preFilled[`L${row}`] ? preFilled[`L${row}`][column] : f2210[getKey(row)];

    const getPrevVal = (row: number): string =>
      f2210[`P4L${row}${columns[columns.indexOf(column) - 1]}`];

    const leftSum = (quarterly: any): string => {
      let total = "0";
      const n = columns.indexOf(column) + 1;
      for (let i = 0; i < n; i++) {
        total = math.add(total, quarterly[columns[i]]);
      }
      return total;
    };

    ////////////////////////////////////////
    // Schedule AI Part II - Annualized Self-Employment Tax

    f2210[getKey(28)] = math.mul(
      math.sub(leftSum(income), leftSum(expenses)),
      "0.9235",
    );

    f2210[getKey(30)] = f1040sse.P2L8d === ""
      ? "0"
      : math.mul(f1040sse.P2L8d, getVal(2));

    if (((forms as any).f4137 || (forms as any).f8919)) {
      log.warn(`See instructions & verify value on line ${getKey(30)}`);
    }

    f2210[getKey(31)] = math.subToZero(getVal(29), getVal(30));

    f2210[getKey(33)] = math.mul(math.min(getVal(28), getVal(31)), getVal(32));

    f2210[getKey(35)] = math.mul(getVal(28), getVal(34));

    f2210[getKey(36)] = math.add(getVal(33), getVal(35));

    ////////////////////////////////////////
    // Schedule AI Part I - Annualized Income Installments

    if (forms.f2555 && math.gt(forms.f2555.L42, "0")) {
      const adjustment = math.div(forms.f2555.L42, getVal(2));
      f2210[getKey(1)] = math.subToZero(leftSum(income), adjustment);
      log.info(`Income for Q${columns.indexOf(column)+1}: ${leftSum(income)} - ${adjustment}`);
    } else {
      f2210[getKey(1)] = leftSum(income);
      log.info(`Income for Q${columns.indexOf(column)+1}: ${leftSum(income)}`);
    }

    f2210[getKey(3)] = math.mul(getVal(1), getVal(2));

    f2210[getKey(4)] = leftSum(expenses);

    f2210[getKey(6)] = math.mul(getVal(4), getVal(5));

    f2210[getKey(7)] = f1040.L9;

    f2210[getKey(8)] = math.max(getVal(6), getVal(7));

    if ((forms as any).f8995) {
      log.warn(`Required but not implemented: f2210.${getKey(9)}`);
    }

    f2210[getKey(10)] = math.add(getVal(8), getVal(9));

    f2210[getKey(11)] = math.subToZero(getVal(3), getVal(10));

    f2210[getKey(12)] = "0";

    f2210[getKey(13)] = math.subToZero(getVal(11), getVal(12));

    if (f1040.Single || f1040.MarriedFilingSeparately) {
      f2210[getKey(14)] = getIncomeTax(getVal(13), FilingStatuses.Single);
    } else if (f1040.MarriedFilingJointly || f1040.QualifiedWidow) {
      f2210[getKey(14)] = getIncomeTax(getVal(13), FilingStatuses.Joint);
    } else if (f1040.HeadOfHousehold) {
      f2210[getKey(14)] = getIncomeTax(getVal(13), FilingStatuses.Head);
    }

    f2210[getKey(15)] = getVal(36);

    f2210[getKey(16)] = math.div(math.sub(f2210.L2, f1040s2.L4), getVal(2));

    f2210[getKey(17)] = math.add(getVal(14), getVal(15), getVal(16));

    f2210[getKey(18)] = math.mul(f2210.L3, "0.25");

    f2210[getKey(19)] = math.subToZero(getVal(17), getVal(18));

    f2210[getKey(21)] = math.mul(getVal(20), getVal(19));

    if (column === "b") {
      f2210[getKey(22)] = f2210.P4L27a;
    } else if (column === "c") {
      f2210[getKey(22)] = math.add(f2210.P4L27a, f2210.P4L27b);
    } else if (column === "d") {
      f2210[getKey(22)] = math.add(f2210.P4L27a, f2210.P4L27b, f2210.P4L27c);
    }

    if (column === "a") {
      f2210[getKey(23)] = getVal(21);
    } else {
      f2210[getKey(23)] = math.subToZero(getVal(21), getVal(22));
    }

    f2210[getKey(24)] = math.mul(f2210.L9, "0.25");

    f2210[getKey(25)] = math.sub(getPrevVal(26), getPrevVal(27));

    f2210[getKey(26)] = math.add(getVal(24), getVal(25));

    f2210[getKey(27)] = math.lt(getVal(23), getVal(26)) ? getVal(23) : getVal(26);

    f2210[`L18${column}`] = getVal(27);
  });

  log.info(`Done with Schedule AI`);

  ////////////////////////////////////////
  // F2210 Part IV - The Megular Method

  columns.forEach(column => {
    const getKey = (row: number): string => `L${row}${column}`;
    const getVal = (row: number): string => f2210[getKey(row)];
    const getPrevVal = (row: number): string =>
      f2210[`L${row}${columns[columns.indexOf(column) - 1]}`];

    f2210[getKey(19)] = payments[column];

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
  });

  ////////////////////////////////////////
  // F2210 Worksheet Section B - Figure the Penalty

  const d190415 = new Date("2019-04-15T00:00:00.000Z").getTime();
  const d190615 = new Date("2019-06-15T00:00:00.000Z").getTime();
  const d190630 = new Date("2019-06-30T00:00:00.000Z").getTime();
  const d190915 = new Date("2019-09-15T00:00:00.000Z").getTime();
  const d190930 = new Date("2019-09-30T00:00:00.000Z").getTime();
  const d191231 = new Date("2019-12-31T00:00:00.000Z").getTime();
  const d200115 = new Date("2020-01-15T00:00:00.000Z").getTime();
  const d200415 = new Date("2020-04-15T00:00:00.000Z").getTime();

  const rows = ["1a", "1b", "2", "3", "4", "5", "6" , "7", "8", "9", "10", "11", "12", "13"];
  const worksheet = {};
  const requiredInstallments = {};

  const chrono = (d1: any, d2: any): number =>
    new Date(d1.timestamp || d1).getTime() - new Date(d2.timestamp || d2).getTime();

  const daysDiff = (d1: number, d2: number): number =>
    Math.round(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24));

  allPayments.sort(chrono);

  let penalty = "0"; 

  const dueLabel = {
    a: "Q1",
    b: "Q2",
    c: "Q3",
    d: "Q4",
  };
   

  columns.forEach(column => {

    requiredInstallments[column] = f2210[`L18${column}`];

    const getKey = (row: number): string => `${rows[row]}_${column}`;
    const getVal = (row: number): string => worksheet[`${rows[row]}_${column}`];

    if (column === "a") {
      worksheet[getKey(2)] = d190415;
      worksheet[getKey(5)] = d190630;
      worksheet[getKey(8)] = d190930;
      worksheet[getKey(11)] = d191231;
    } else if (column === "b") {
      worksheet[getKey(2)] = d190615;
      worksheet[getKey(5)] = d190630;
      worksheet[getKey(8)] = d190930;
      worksheet[getKey(11)] = d191231;
    } else if (column === "c") {
      worksheet[getKey(5)] = d190915;
      worksheet[getKey(8)] = d190930;
      worksheet[getKey(11)] = d191231;
    } else if (column === "d") {
      worksheet[getKey(11)] = d200115;
    }

    worksheet[getKey(0)] = f2210[`L25${column}`];
    log.info(`Underpayment for period ${column}: ${getVal(0)}`);

    let togo = requiredInstallments[column];
    worksheet[getKey(1)] = [];

    while (math.gt(togo, "0")) {

      const payment = allPayments.shift();
      log.debug(`Processing payment: ${JSON.stringify(payment)}`);

      if (!payment) {
        worksheet[getKey(1)].push({
          date: Date.now(),
          value: togo,
        });
        log.warn(`You didn't make enough payments.. Assuming you pay the rest today..`);
        break;

      } else if (math.gt(payment.value, togo)) {
        log.debug(`Applying part of payment & we're done: ${JSON.stringify(payment)}`);
        payment.value = math.sub(payment.value, togo);
        // put the rest of this payment back
        allPayments.unshift(payment);
        worksheet[getKey(1)].push({
          date: payment.date,
          value: togo,
        });
        togo = "0";

      } else {
        log.debug(`Applying entire payment & getting the next one: ${JSON.stringify(payment)}`);
        togo = math.sub(togo, payment.value);
        worksheet[getKey(1)].push(payment);

      }
    }

    if (!math.eq(togo, "0")) {
      log.warn(`After all payments made, still ${togo} to go`);
    }

    let total;
    if (["a", "b"].includes(column)) {
      worksheet[getKey(3)] = [];
      worksheet[getKey(4)] = [];
      total = "0";
      worksheet[getKey(1)].forEach(payment => {
        const diff = daysDiff(Math.min(payment.date, d190630), worksheet[getKey(2)]);
        const amt = math.round(math.mul(worksheet[getKey(0)], (diff / 365).toString(), "0.06"));
        worksheet[getKey(3)].push(diff);
        worksheet[getKey(4)].push(amt);
        total = math.add(total, amt);
      });
      log.info(`Penalty owed for ${dueLabel[column]} taxes in Q2: [${worksheet[getKey(3)]}] => [${worksheet[getKey(4)]}] => ${total}`);
      penalty = math.add(penalty, total);
    }

    if (["a", "b", "c"].includes(column)) {
      worksheet[getKey(6)] = [];
      worksheet[getKey(7)] = [];
      total = "0";
      worksheet[getKey(1)].forEach(payment => {
        const diff = daysDiff(Math.min(payment.date, d190930), worksheet[getKey(5)]);
        const amt = math.round(math.mul(worksheet[getKey(0)], (diff / 365).toString(), "0.06"));
        worksheet[getKey(6)].push(diff);
        worksheet[getKey(7)].push(amt);
        total = math.add(total, amt);
      });
      log.info(`Penalty owed for ${dueLabel[column]} taxes in Q3: [${worksheet[getKey(6)]}] => [${worksheet[getKey(7)]}] => ${total}`);
      penalty = math.add(penalty, total);

      worksheet[getKey(9)] = [];
      worksheet[getKey(10)] = [];
      total = "0";
      worksheet[getKey(1)].forEach(payment => {
        const diff = daysDiff(Math.min(payment.date, d191231), worksheet[getKey(8)]);
        const amt = math.round(math.mul(worksheet[getKey(0)], (diff / 365).toString(), "0.06"));
        worksheet[getKey(9)].push(diff);
        worksheet[getKey(10)].push(amt);
        total = math.add(total, amt);
      });
      log.info(`Penalty owed for ${dueLabel[column]} taxes in Q4: [${worksheet[getKey(9)]}] => [${worksheet[getKey(10)]}] => ${total}`);
      penalty = math.add(penalty, total);
    }

    total = "0";
    worksheet[getKey(12)] = [];
    worksheet[getKey(13)] = [];
    worksheet[getKey(1)].forEach(payment => {
      const diff = daysDiff(Math.min(payment.date, d200415), worksheet[getKey(11)]);
      const amt = math.round(math.mul(worksheet[getKey(0)], (diff / 365).toString(), "0.06"));
      worksheet[getKey(12)].push(diff);
      worksheet[getKey(13)].push(amt);
      total = math.add(total, amt);
    });
    log.info(`Penalty owed for ${dueLabel[column]} taxes in Q5: [${worksheet[getKey(12)]}] => [${worksheet[getKey(13)]}] => ${total}`);
    penalty = math.add(penalty, total);

  }); 

  log.info(`Total Penalty: ${penalty}`);

  f2210.L27 = penalty;
  f1040.L24 = penalty;


  return { ...forms, f2210, f1040 };
};
