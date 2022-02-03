import { Logger } from "@valuemachine/types";

import { thisYear } from "./const";
import {
  Forms,
  getNetBusinessIncome,
  getSelfEmploymentAdjustment,
  getSelfEmploymentTax,
  IncomeTypes,
  math,
  strcat,
  sumIncome,
  TaxInput,
  TaxRows,
} from "./utils";

export const f1040sse = (
  forms: Forms,
  input: TaxInput,
  rows: TaxRows,
  logger: Logger,
): Forms => {
  const log = logger.child({ name: "f1040sse" });
  const { f1040s1, f1040s2, f1040sc, f1040sse } = forms;
  const personal = input.personal || {};

  const netBusinessIncome = getNetBusinessIncome(thisYear, rows);

  // If no se income, then omit this form
  if (!math.gt(netBusinessIncome, "0")) {
    delete forms.f1040sse;
    return forms;
  }

  f1040sse.Name = strcat([personal.firstName, personal.lastName]);
  f1040sse.SSN = personal.SSN;

  ////////////////////////////////////////
  // Part I - Self-Employment Tax

  f1040sse.L3 = math.add(
    f1040sse.L1a, // farm profit (from f1040sf or f1065)
    f1040sse.L1b, // conservation reserve program payments (from f1040sf or f1065)
    netBusinessIncome, // should match f1040sc.L7
  );

  f1040sse.L4a = math.gt(f1040sse.L3, "0") ? math.mul(f1040sse.L3, "0.9235"): f1040sse.L3;

  ////////////////////////////////////////
  // Part II - Optional Net Earning Method
  const L14 = "5640";

  if ("f1040sf" in forms) log.warn(`NOT_IMPLEMENTED: f1040sf logic in Part II`);
  f1040sse.L15 = "0";

  if (math.gt(f1040sc.L31, "0") && math.lt(f1040sc.L31, "6107")) {
    // also check: (need to ensure we have all tax rows & not just for this year)
    // validYears = rows.reduce(sumUpEveryYearsSelfEmploymentIncome).filter(incomeMoreThan400)
    // if (validYears.filter(lastThreeYears).length < 2) abort
    // if (validYears.length > 5) abort
    log.warn(`Using special deduction on f1040sse.L17`);
    f1040sse.L16 = math.sub(L14, f1040sse.L15);
    f1040sse.L17 = math.min(
      f1040sse.L16,
      f1040sc.L7,
    );
  }
  f1040sse.L4b = math.add(f1040sse.L15, f1040sse.L17);

  ////////////////////////////////////////
  // Resume Part I

  f1040sse.L4c = math.add(f1040sse.L4a, f1040sse.L4b);
  if (math.lt(f1040sse.L4c, "400")) {
    log.info(`Not filing form f1040sse bc L4c < 400`);
    delete forms.f1040sse;
    return forms;
  }

  f1040sse.L5a = sumIncome(thisYear, rows, IncomeTypes.Church);
  f1040sse.L5b = math.mul(f1040sse.L5a, "0.9235");
  if (math.lt(f1040sse.L5b, "100")) {
    f1040sse.L5b = "0";
  }

  f1040sse.L6 = math.add(
    f1040sse.L4c, // taxable se income
    f1040sse.L5b, // taxable church income
  );

  const L7 = "137700";

  f1040sse.L8d = math.add(
    f1040sse.L8a, // total social security wages
    f1040sse.L8b, // unreported tips (f4137)
    f1040sse.L8c, // taxable wages
  );
  f1040sse.L9 = math.subToZero(L7, f1040sse.L8d);
  f1040sse.L10 = math.mul(math.min(f1040sse.L6, f1040sse.L9), "0.124");
  f1040sse.L11 = math.mul(f1040sse.L6, "0.029");

  log.info(`f1040sse.L4a=${f1040sse.L4a}`);
  log.info(`f1040sse.L4b=${f1040sse.L4b}`);
  log.info(`f1040sse.L4c=${f1040sse.L4c}`);
  log.info(`f1040sse.L10=${f1040sse.L10}`);
  log.info(`f1040sse.L11=${f1040sse.L11}`);

  f1040sse.L12 = getSelfEmploymentTax(thisYear, rows);
  log.info(`Self employment tax: f1040sse.L12=${f1040sse.L12}`);
  f1040s2.L4 = f1040sse.L12;
  const L12 = math.add(f1040sse.L10, f1040sse.L11);
  if (!math.eq(L12, f1040sse.L12))
    log.warn(`DOUBLE_CHECK_FAILED: sum(L10-L11)=${L12} !== f1040sse.L12=${f1040sse.L12}`);

  f1040sse.L13 = getSelfEmploymentAdjustment(thisYear, rows);
  log.info(`Self employment tax deduction: f1040sse.L13=${f1040sse.L13}`);
  f1040s1.L14 = f1040sse.L13;
  const L13 = math.mul(f1040sse.L12, "0.5");
  if (!math.eq(L13, f1040sse.L13))
    log.warn(`DOUBLE_CHECK_FAILED: L13/2=${L13} !== f1040sse.L13=${f1040sse.L13}`);

  return { ...forms, f1040s1, f1040s2, f1040sse };
};
