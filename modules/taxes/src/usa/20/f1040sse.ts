import {
  IncomeTypes,
  Logger,
  TaxActions,
  TaxInput,
  TaxRow,
} from "@valuemachine/types";

import {
  Forms,
  getTotalValue,
  math,
  strcat,
  thisYear,
} from "./utils";

export const f1040sse = (
  forms: Forms,
  input: TaxInput,
  taxRows: TaxRow[],
  logger: Logger,
): Forms => {
  const log = logger.child({ module: "f1040sse" });
  const { f1040, f1040s1, f1040s2, f1040s3, f1040sc, f1040sse } = forms;
  const personal = input.personal || {};

  const seIncome = getTotalValue(
    taxRows.filter(thisYear),
    TaxActions.Income,
    { incomeType: IncomeTypes.Business },
  );

  // If no se income, then omit this form
  if (!math.gt(seIncome, "0")) {
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
    seIncome, // supposed to be from f1040sc.L7 but recalculated to avoid circular dependency
  );

  f1040sse.L4a = math.gt(f1040sse.L3, "0") ? math.mul(f1040sse.L3, "0.9235"): f1040sse.L3;

  ////////////////////////////////////////
  // Part II - Optional Net Earning Method
  const L14 = "5640";

  if ("f1040sf" in forms) log.warn(`NOT_IMPLEMENTED: f1040sf logic in Part II`);
  f1040sse.L15 = "0";

  if (math.gt(f1040sc.L31, "0") && math.lt(f1040sc.L31, "6107")) {
    // also check: (need to ensure we have all tax rows & not just for this year)
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
    log.info(`Not filing form f1040sse bc L4c < 400`);
    delete forms.f1040sse;
    return forms;
  }

  f1040sse.L5a = getTotalValue(
    taxRows.filter(thisYear),
    TaxActions.Income,
    { incomeType: IncomeTypes.Church },
  );


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

  const marToDec = row => {
    const year = row.date.substring(0, 4);
    const time = new Date(row.date).getTime();
    return time
      && time >= new Date(`${year}-03-27`).getTime()
      && time < new Date(`${year}-12-31`).getTime();
  };

  if (math.eq(f1040sse.L4c, "0")) {
    f1040sse.L21 = "0";
  } else {
    if ("f1040sf" in forms) log.warn(`NOT_IMPLEMENTED: f1040sf income from Mar-Dec`);
    f1040sse.L18 = getTotalValue(
      taxRows.filter(marToDec),
      TaxActions.Income,
      { incomeType: IncomeTypes.Business },
    );
    f1040sse.L19 = math.gt(f1040sse.L18, "0") ? math.mul(f1040sse.L18, "0.9235") : f1040sse.L18;
    // instructions say x0.775 is good: https://www.irs.gov/pub/irs-pdf/i1040sse.pdf#page=6
    f1040sse.L20 = math.mul(math.add(f1040sse.L15, f1040sse.L17), "0.775");
    f1040sse.L21 = math.add(f1040sse.L19, f1040sse.L20);
  }

  if (math.eq(f1040sse.L5b, "0")) {
    f1040sse.L23 = "0";
  } else {
    f1040sse.L22 = getTotalValue(
      taxRows.filter(marToDec),
      TaxActions.Income,
      { incomeType: IncomeTypes.Church },
    );
    f1040sse.L23 = math.mul(f1040sse.L22, "0.9235");
  }

  f1040sse.L24 = math.add(f1040sse.L21, f1040sse.L23);
  f1040sse.L25 = math.min(f1040sse.L9, f1040sse.L24);
  f1040sse.L26 = math.mul(f1040sse.L25, "0.062");

  if (!math.eq(f1040sse.L26, "0")) {
    f1040s3.L12e = f1040sse.L26;
    log.warn(`Deferring maximum self employment taxes: f1040s3.L12e=${f1040s3.L12e}`);

    ////////////////////////////////////////
    // Deferral Worksheet for Schedule SE

    const ws = {} as any;

    ws.L1a = math.add(
      f1040.L25d, // taxes withheld
      f1040.L26,  // estimated tax payments
      f1040.L27,  // earned income credit
      f1040.L28,  // child tax credit
      f1040.L29,  // f8853 credit
      f1040.L30,  // recovery rebate credit
    );
    ws.L1b = math.add(
      f1040s3.L8,  // f8962 credit
      f1040s3.L9,  // payment w extension request
      f1040s3.L10,  // social security withholdings
      f1040s3.L11,  // fuel tax credit
      f1040s3.L12a,  // f2439 credit
      f1040s3.L12b,  // sick & family leave credits
      f1040s3.L12c,  // health coverage credit
      f1040s3.L12d,  // other tax credits
    );
    ws.L1c = math.add(ws.L1a, ws.L1b);

    ws.L2 = f1040.L24; // total tax

    if ("f1040sh" in forms) {
      log.warn(`NOT_IMPLEMENTED: f1040sh deferrals L3a-L3b (i1040 pg 105)`);
      ws.L3c = "0";
    } else {
      ws.L3c = "0";
    }

    ws.L4 = math.add(ws.L2, ws.L3c);

    if ("f1040sh" in forms) {
      log.warn(`NOT_IMPLEMENTED: f1040sh deferrals L5 (i1040 pg 105)`);
      ws.L5 = "0";
    } else {
      ws.L5 = "0";
    }

    ws.L6 = f1040sse.L26;

    ws.L7 = math.add(ws.L5, ws.L6);

    ws.L8 = math.sub(ws.L4, ws.L7);

    ws.L9 = math.subToZero(ws.L1c, ws.L8);

    ws.L10 = math.subToZero(ws.L7, ws.L9);

    ws.L11 = f1040s3.L12e; // amount reported (doesn't have to be the full amount)

    ws.L12 = math.mul(ws.L7, "0.5");

    ws.L13 = math.min(ws.L11, ws.L12);
    log.warn(`A Tax Payment of ${ws.L13} is due on 2022-12-31`);

    ws.L14 = math.min(ws.L11, ws.L13);
    log.warn(`A Tax Payment of ${ws.L13} is due on 2021-12-31`);

  }

  return { ...forms, f1040s1, f1040s2, f1040sse };
};
