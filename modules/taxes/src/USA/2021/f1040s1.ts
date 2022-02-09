import { Logger } from "@valuemachine/types";

import { thisYear } from "./const";
import {
  Forms,
  getTotalIncomeAdjustments,
  IncomeTypes,
  math,
  strcat,
  sumIncome,
  TaxInput,
  TaxRows,
} from "./utils";

export const f1040s1 = (
  forms: Forms,
  input: TaxInput,
  rows: TaxRows,
  logger: Logger,
): Forms => {
  const log = logger.child({ name: "f1040s1" });
  const { f1040, f1040s1 } = forms;
  const personal = input.personal || {};

  f1040s1.Name = strcat([personal.firstName, personal.lastName]);
  f1040s1.SSN = personal?.SSN;

  ////////////////////////////////////////
  // Part I - Additional Income

  f1040s1.L1 = sumIncome(thisYear, rows, IncomeTypes.TaxCredit);
  f1040s1.L2a = sumIncome(thisYear, rows, IncomeTypes.Alimony);
  f1040s1.L7 = sumIncome(thisYear, rows, IncomeTypes.Unemployment);

  f1040s1.L8h = sumIncome(thisYear, rows, IncomeTypes.Prize);

  const airdrops = sumIncome(thisYear, rows, IncomeTypes.Airdrop);
  if (math.gt(airdrops, "0")) {
    log.info(`Earned ${airdrops} in airdrops`);
    f1040s1.L8z_Etc2 = strcat([f1040s1.L8z_Etc2, `Airdrops=${math.round(airdrops, 2)}`], ", ");
    f1040s1.L8z = math.add(f1040s1.L8z, airdrops);
  }

  f1040s1.L9 = math.add(
    math.mul(f1040s1.L8a, "-1"), // net operating loss
    f1040s1.L8b, // gambling
    f1040s1.L8c, // cancellation of debt
    math.mul(f1040s1.L8d, "-1"), // foreign earned income exclusion from f2555
    f1040s1.L8e, // taxable health savings account distribution
    f1040s1.L8f, // alaska permenant fund
    f1040s1.L8g, // jury duty
    f1040s1.L8h, // prizes & awards
    f1040s1.L8i, // activity not engaged in for profit
    f1040s1.L8j, // stock options
    f1040s1.L8k, // non-business rental income
    f1040s1.L8l, // (para-)olympic prize money
    f1040s1.L8m, // section 951(a) inclusion
    f1040s1.L8n, // section 951A(a) inclusion
    f1040s1.L8o, // section 461(l) inclusion
    f1040s1.L8p, // ABLE account distributions
    f1040s1.L8z, // Other income
  );
  log.info(`Other additional income: f1040s1.L9=${f1040s1.L9}`);

  f1040s1.L10 = math.add(
    f1040s1.L1,  // taxable refunds/credits/offsets
    f1040s1.L2a, // alimony received
    f1040s1.L3,  // business income from f1040sc
    f1040s1.L4,  // other gains from f4797
    f1040s1.L5,  // rental/s-corp/trust income from f1040se
    f1040s1.L6,  // farm income from f1040sf
    f1040s1.L7,  // unemployment compensation
    f1040s1.L9,  // other income
  );
  log.info(`Total additional income: f1040s1.L10=${f1040s1.L10}`);
  f1040.L8 = f1040s1.L10;

  ////////////////////////////////////////
  // Part II - Adjustments to  Income

  f1040s1.L25 = math.add(
    f1040s1.L24a, // juty duty
    f1040s1.L24b, // deductible expenses from rental income
    f1040s1.L24c, // non-taxable amoutn of (para-)olympic prizes
    f1040s1.L24d, // reforestation
    f1040s1.L24e, // repayment of supplemental unemployment benefits
    f1040s1.L24f, // contributions to pension plans
    f1040s1.L24g, // contributions by certain chaplains
    f1040s1.L24h, // attorney fees and court costs for actions involving certain claims
    f1040s1.L24i, // attorney fees and court costs for snitching on tax evaders
    f1040s1.L24j, // housing deductions from f2555
    f1040s1.L24k, // excess deductions of section 67(e) expenses from Schedule K-1
    f1040s1.L24z, // other adjustments
  );

  f1040s1.L26 = getTotalIncomeAdjustments(thisYear, rows);
  log.info(`Total adjustments to income: f1040s1.L26=${f1040s1.L26}`);
  const L26 = math.add(
    f1040s1.L11,  // educator expenses
    f1040s1.L12,  // certain business expenses of reservists, etc from f2106
    f1040s1.L13,  // health savings account deduction from f8889
    f1040s1.L14,  // Moving expenses for members of the Armed Forces from f3903
    f1040s1.L15,  // deductible part of self-employment tax from f1040sse
    f1040s1.L16,  // self-employed SEP, SIMPLE, and qualified plans
    f1040s1.L17,  // self-employed health insurance deduction
    f1040s1.L18,  // penalty on early withdrawal of savings
    f1040s1.L19a, // alimony paid
    f1040s1.L20,  // IRA deduction
    f1040s1.L21,  // student loan interest deduction
    f1040s1.L23,  // archer MSA deduction
    f1040s1.L25,  // other adjustments
  );
  if (!math.eq(L26, f1040s1.L26))
    log.warn(`DOUBLE_CHECK_FAILED: sum(L10-L21)=${L26} !== f1040s1.L26=${f1040s1.L26}`);

  f1040.L10 = f1040s1.L26;

  // If relevant values are all zero, don't file this form
  if (math.eq(f1040s1.L10, "0") && math.eq(f1040s1.L26, "0")) {
    delete forms.f1040s1;
    return forms;
  } else {
    return { ...forms, f1040, f1040s1 };
  }

};
