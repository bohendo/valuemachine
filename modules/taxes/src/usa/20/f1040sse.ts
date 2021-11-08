import { Logger, IncomeTypes, TaxInput, TaxRow } from "@valuemachine/types";

import { Forms, math, processIncome } from "./utils";

export const f1040sse = (
  forms: Forms,
  input: TaxInput,
  taxRows: TaxRow[],
  logger: Logger,
): Forms => {
  const log = logger.child({ module: "f1040sse" });
  const { f1040s1, f1040s2, f1040s3, f1040sc, f1040sse } = forms;
  const { personal, business } = input;

  // If no business info, then omit this form
  if (!business?.industry) {
    delete forms.f1040sse;
    return forms;
  }

  f1040sse.Name = `${personal?.firstName || ""} ${personal?.lastName || ""}`;
  f1040sse.SSN = personal?.SSN;

  ////////////////////////////////////////
  // Part I - Self-Employment Tax

  let totalIncome = "0";
  processIncome(taxRows, (income: TaxRow, value: string): void => {
    if (income.tag.incomeType === IncomeTypes.SelfEmployed) {
      totalIncome = math.add(totalIncome, value);
    }
  });

  f1040sse.L3 = math.add(
    f1040sse.L1a, // farm profit (from f1040sf or f1065)
    f1040sse.L1b, // conservation reserve program payments (from f1040sf or f1065)
    totalIncome, // supposed to be from f1040sc.L7 but recalculated to avoid circular dependency
  );

  f1040sse.L4a = math.gt(f1040sse.L3, "0") ? math.mul(f1040sse.L3, "0.9235"): f1040sse.L3;

  ////////////////////////////////////////
  // Part II - Optional Net Earning Method
  const L14 = "5640";
  if ("f1040sf" in forms) {
    log.warn(`Required but not implemented: f1040sf logic in Part II`);
  } else {
    f1040sse.L15 = "0";
  }
  if (math.lt(f1040sc?.L31, "6107")) {
    // TODO: also check: (need to ensure we have all tax rows & not just for this year)
    // validYears = taxRows.reduce(sumUpEveryYearsSelfEmploymentIncome).filter(incomeMoreThan400)
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
    log.warn(`Not filing form f1040sse bc L4c < 400`);
    delete forms.f1040sse;
    return forms;
  }

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
  f1040sse.L12 = math.add(f1040sse.L10, f1040sse.L11);
  f1040sse.L13 = math.mul(f1040sse.L12, "0.5");

  f1040s2.L4 = f1040sse.L12;
  log.info(`Self employment tax: f1040s2.L4=${f1040s2.L4}`);

  f1040s1.L14 = f1040sse.L13;
  log.info(`Self employment tax deduction: f1040s1.L14=${f1040s1.L14}`);

  ////////////////////////////////////////
  // Part III - Maximum Deferral of Payments

  if (math.eq(f1040sse.L4c, "0")) {
    f1040sse.L21 = "0";
  } else {
    log.warn(`Using 75% instead of calculating share of income from March-December`);
    f1040sse.L18 = math.mul(f1040sse.L3, "0.75") ;
    f1040sse.L19 = math.gt(f1040sse.L18, "0") ? math.mul(f1040sse.L18, "0.9235") : f1040sse.L18;
    f1040sse.L20 = math.mul(math.add(f1040sse.L15, f1040sse.L17), "0.75");
    f1040sse.L21 = math.add(f1040sse.L19, f1040sse.L20);
  }

  if (math.eq(f1040sse.L5b, "0")) {
    f1040sse.L23 = "0";
  } else {
    log.warn(`Using 75% instead of calculating share of income from March-December`);
    f1040sse.L22 = math.mul(f1040sse.L5a, "0.75");
    f1040sse.L23 = math.mul(f1040sse.L22, "0.9235");
  }

  f1040sse.L24 = math.add(f1040sse.L21, f1040sse.L23);
  f1040sse.L25 = math.min(f1040sse.L9, f1040sse.L24);
  f1040sse.L26 = math.mul(f1040sse.L25, "0.062");

  if (!math.eq(f1040sse.L26, "0")) {
    f1040s3.L12e = f1040sse.L26;
    log.info(`Max deferral of self employment taxes: f1040s3.L12e=${f1040s3.L12e}`);
    log.warn(`Required but not implemented: Deferral Worksheet on i1040 page 105`); // TODO no rush
  }

  return { ...forms, f1040s1, f1040s2, f1040sse };
};
