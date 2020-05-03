import { Log, LogTypes, IncomeLog, ExpenseLog } from "@finances/types";
import { ContextLogger, LevelLogger, math } from "@finances/utils";

import { env } from "../env";
import { Forms } from "../types";

export const f2210 = (vmLogs: Log[], oldForms: Forms): Forms => {
  const log = new ContextLogger("f2210", new LevelLogger(env.logLevel));
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040, f1040s2, f1040s3, f2210 } = forms;

  f2210.FullName = `${f1040.FirstNameMI} ${f1040.LastName}`;
  f2210.SSN = f1040.SocialSecurityNumber;

  f2210.L1 = f1040.L14;
  f2210.L2 = math.add(f1040s2.L4, f1040s2.L6, f1040s2.L7a, f1040s2.L7b, f1040s2.L8);

  if (math.gt(f1040s2.L8, "0") || math.gt(f1040s2.L7a, "0")) {
    log.warn(`Read instructions & verify value on f2210.L2`);
  }

  if (math.eq(f2210.L3, "0")) {
    log.error(`Required but not implemented or provided: f2210.L3`);
  }

  f2210.L3 = math.add(f1040s3.L2, f1040s3.L3);

  f2210.L4 = math.add(f2210.L1,f2210.L2, f2210.L3);

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

  f2210.L9 = math.lt(f2210.L5, f2210.L8) ? f2210.L5 : f2210.L8;

  if (math.lt(f2210.L8, f2210.L5)) {
    f2210.C0_E = false;
  }

  if (!f2210.C0_A && !f2210.C0_B && !f2210.C0_C && !f2210.C0_D && !f2210.C0_E) {
    log.info(`No penalty required, not filing form 2210`);
    delete forms.f2210;
    return forms;
  }

  if (math.gt(f2210.L9, f2210.L6)) {
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
  } else {
    f2210.C9_Yes = true;
    if ((f2210.C0_A || f2210.C0_E) && !f2210.C0_B && !f2210.C0_C && !f2210.C0_D) {
      log.info(`No figuring penalty, filing only page 1 of form 2210`);
      return forms;
    }
  }

  const columns = ["a", "b", "c", "d"];

  const getGetKey = (prefix: string, column: string) => (row: number): string =>
    `${prefix}${row}${column}`;

  const getGetVal = (getKey: any) => (row: number): string => f2210[getKey(row)];

  const getGetPrevVal = (prefix: string, column: string) => (row: number): string =>
    f2210[`${prefix}${row}${columns[columns.indexOf(column) - 1]}`];

  ////////////////////////////////////////
  // Schedule AI - Annualized Income Installment Method

  const Q0 = new Date("2019-01-01T00:00:00.000Z").getTime();
  const Q1 = new Date("2019-04-01T00:00:00.000Z").getTime();
  const Q2 = new Date("2019-06-01T00:00:00.000Z").getTime();
  const Q3 = new Date("2019-08-01T00:00:00.000Z").getTime();
  const Q4 = new Date("2020-01-01T00:00:00.000Z").getTime();

  const quarterlyIncome = { a: "0", b: "0", c: "0", d: "0" };
  const quarterlyExpenses = { a: "0", b: "0", c: "0", d: "0" };

  vmLogs.filter(l => l.type === LogTypes.Income).forEach((income: IncomeLog): void => {
    const date = new Date(income.date).getTime();
    const value = math.mul(income.quantity, income.assetPrice);
    if (date > Q0 && date < Q1) {
      quarterlyIncome[columns[0]] = math.add(quarterlyIncome[columns[0]], value);
    } else if (date > Q0 && date < Q2) {
      quarterlyIncome[columns[1]] = math.add(quarterlyIncome[columns[1]], value);
    } else if (date > Q0 && date < Q3) {
      quarterlyIncome[columns[2]] = math.add(quarterlyIncome[columns[2]], value);
    } else if (date > Q0 && date < Q4) {
      quarterlyIncome[columns[3]] = math.add(quarterlyIncome[columns[3]], value);
    }
  });

  vmLogs.filter(l =>
    l.type === LogTypes.Expense &&
    !l.taxTags.includes("ignore") &&
    l.taxTags.some(tag => tag.startsWith("f1040sc")),
  ).forEach((expense: IncomeLog | ExpenseLog): void => {
    const date = new Date(expense.date).getTime();
    const value = math.mul(expense.quantity, expense.assetPrice);
    if (date > Q0 && date < Q1) {
      quarterlyExpenses[columns[0]] = math.add(quarterlyExpenses[columns[0]], value);
    } else if (date > Q0 && date < Q2) {
      quarterlyExpenses[columns[1]] = math.add(quarterlyExpenses[columns[1]], value);
    } else if (date > Q0 && date < Q3) {
      quarterlyExpenses[columns[2]] = math.add(quarterlyExpenses[columns[2]], value);
    } else if (date > Q0 && date < Q4) {
      quarterlyExpenses[columns[3]] = math.add(quarterlyExpenses[columns[3]], value);
    }
  });

  const annualizationAmounts = {
    L2: { a: "4", b: "2.4", c: "1.5", d: "1" },
    L5: { a: "4", b: "2.4", c: "1.5", d: "1" },
  };

  columns.forEach(column => {
    const getKey = getGetKey("P4L", column);
    const getVal = getGetVal(getKey);

    ////////////////////////////////////////
    // Part II - Annualized Self-Employment Tax

    f2210[getKey(28)] = math.mul(
      math.sub(quarterlyIncome[column], quarterlyExpenses[column]),
      "0.9235",
    );

    log.warn(`Required but not implemented: f2210.L30`);

    f2210[getKey(31)] = math.subToZero(getVal(29), getVal(30));

    ////////////////////////////////////////
    // Part I - Annualized Income Installments

    f2210[getKey(1)] = quarterlyIncome[column];

    f2210[getKey(3)] = math.mul(getVal(1), annualizationAmounts.L2[column]);

    f2210[getKey(4)] = quarterlyExpenses[column];

    f2210[getKey(6)] = math.mul(getVal(5), annualizationAmounts.L5[column]);

    f2210[getKey(7)] = f1040.L9;

    f2210[getKey(8)] = math.gt(getVal(6), getVal(7)) ? getVal(6) : getVal(7);

    log.warn(`Required but not implemented: f2210.L9`);

    f2210[getKey(10)] = math.add(getVal(8), getVal(9));

    f2210[getKey(11)] = math.sub(getVal(3), getVal(10));

    f2210[getKey(12)] = "0";

    f2210[getKey(13)] = math.subToZero(getVal(11), getVal(12));

    log.warn(`Required but not implemented: f2210.L14`);

    f2210[getKey(15)] = math.subToZero(getVal(11), getVal(12));

    f2210[getKey(35)] = math.mul(getVal(28), getVal(34));
    f2210[getKey(36)] = math.add(getVal(33), getVal(35));
  });

  ////////////////////////////////////////
  // Part IV - The Megular Method

  if (f2210.C0_C) {
    log.warn(`Required but not implemented: Schedule AI`);
  }

  columns.forEach(column => {
    const getKey = getGetKey("L", column);
    const getVal = getGetVal(getKey);
    const getPrevVal = getGetPrevVal("L", column);

    f2210[getKey(18)] = math.mul(f2210.L9, "0.25");

    if (math.eq(f2210[getKey(19)], "0")) {
      log.warn(`Required but not provided or implemented: ${getKey(19)}`);
    }

    if (column !== "a") {
      f2210[getKey(20)] = getPrevVal(26);
      f2210[getKey(21)] = math.add(getVal(19), getVal(20));
      f2210[getKey(22)] = math.add(
        getPrevVal(24),
        getPrevVal(25),
      );
      f2210[getKey(23)] = getVal(19);
    } else {
      f2210[getKey(23)] = math.subToZero(getVal(21), getVal(22));
      f2210[getKey(24)] = math.eq(getVal(23), "0")
        ? math.sub(getVal(22), getVal(21))
        : "0";
    }

    f2210[getKey(25)] = math.lt(getVal(18), getVal(22))
      ? "0"
      : math.sub(getVal(18), getVal(23));

    f2210[getKey(26)] = math.lt(getVal(18), getVal(22)) && math.gt(getVal(23), getVal(18))
      ? math.sub(getVal(23), getVal(18))
      : "0";
  });

  ////////////////////////////////////////
  // Section B - Figure the Penalty

  return { ...forms, f2210 };
};
