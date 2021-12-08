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
  const log = logger.child({ module: "f1040s1" });
  const { f1040, f1040s1 } = forms;
  const personal = input.personal || {};

  f1040s1.Name = strcat([personal.firstName, personal.lastName]);
  f1040s1.SSN = personal?.SSN;

  ////////////////////////////////////////
  // Part I - Additional Income

  f1040s1.L1 = sumIncome(thisYear, rows, IncomeTypes.TaxCredit);
  f1040s1.L2a = sumIncome(thisYear, rows, IncomeTypes.Alimony);
  f1040s1.L7 = sumIncome(thisYear, rows, IncomeTypes.Unemployment);

  // Prize money won from hackathons, airdrops, etc can go here I guess
  const prizeMoney = sumIncome(thisYear, rows, IncomeTypes.Prize);
  if (math.gt(prizeMoney, "0")) {
    log.info(`Earned ${prizeMoney} in prizes`);
    f1040s1.L8_Etc2 = strcat([f1040s1.L8_Etc2, `Prizes=${math.round(prizeMoney, 2)}`], ", ");
    f1040s1.L8 = math.add(f1040s1.L8, prizeMoney);
  }
  const airdrops = sumIncome(thisYear, rows, IncomeTypes.Airdrop);
  if (math.gt(airdrops, "0")) {
    log.info(`Earned ${airdrops} in airdrops`);
    f1040s1.L8_Etc2 = strcat([f1040s1.L8_Etc2, `Airdrops=${math.round(airdrops, 2)}`], ", ");
    f1040s1.L8 = math.add(f1040s1.L8, airdrops);
  }

  f1040s1.L9 = math.add(
    f1040s1.L1,  // taxable refunds/credits/offsets
    f1040s1.L2a, // alimony recieved
    f1040s1.L3,  // business income from f1040sc
    f1040s1.L4,  // other gains from f4797
    f1040s1.L5,  // rental/s-corp/trust income from f1040se
    f1040s1.L6,  // farm income from f1040sf
    f1040s1.L7,  // unemployment compensation
    f1040s1.L8,  // other income
  );
  log.info(`Total additional income: f1040s1.L9=${f1040s1.L9}`);
  f1040.L8 = f1040s1.L9;

  ////////////////////////////////////////
  // Part II - Adjustments to  Income

  f1040s1.L22 = getTotalIncomeAdjustments(thisYear, rows);
  log.info(`Total adjustments to income: f1040s1.L22=${f1040s1.L22}`);
  f1040.L10a = f1040s1.L22;
  const L22 = math.add(
    f1040s1.L10,  // educator expenses
    f1040s1.L11,  // special business expenses (f2106)
    f1040s1.L12,  // health savings account (f8889)
    f1040s1.L13,  // military moving expenses (3903)
    f1040s1.L14,  // self employment tax deduction (f1040sse)
    f1040s1.L15,  // self employed SEP/SIMPLE
    f1040s1.L16,  // self employed health insurance deduction
    f1040s1.L17,  // early withdrawal penalty
    f1040s1.L18a, // alimony paid
    f1040s1.L19,  // IRA deduction
    f1040s1.L20,  // student loan interest deduction
    f1040s1.L21,  // tuition deduction (form f8917)
  );
  if (!math.eq(L22, f1040s1.L22))
    log.warn(`DOUBLE_CHECK_FAILED: sum(L10-L21)=${L22} !== f1040s1.L22=${f1040s1.L22}`);

  return { ...forms, f1040, f1040s1 };
};
