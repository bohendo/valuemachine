import {
  Forms,
  IncomeTypes,
  Logger,
  math,
  processIncome,
  TaxInput,
  TaxRow,
} from "./utils";

export const f1040s1 = (
  forms: Forms,
  input: TaxInput,
  taxRows: TaxRow[],
  logger: Logger,
): Forms => {
  const log = logger.child({ module: "f1040s1" });
  const { f1040, f1040s1 } = forms;
  const { personal } = input;

  f1040s1.Name = `${personal?.firstName || ""} ${personal?.lastName || ""}`;
  f1040s1.SSN = personal?.SSN;

  ////////////////////////////////////////
  // Part I - Additional Income

  // Prize money won from hackathons, airdrops, etc can go here I guess
  let prizeMoney = "0";
  processIncome(taxRows, (income: TaxRow, value: string): void => {
    if (income.tags.incomeType === IncomeTypes.Prize) {
      prizeMoney = math.add(prizeMoney, value);
      log.info(`Adding income of ${value}`);
    }
  });
  if (math.gt(prizeMoney, "0")) {
    log.info(`Earned ${prizeMoney} in prizes`);
    f1040s1.L8_Etc2 = (f1040s1.L8_Etc2 || "").split(", ").concat(`prizes ${prizeMoney}`).join(", ");
    f1040s1.L8 = math.add(f1040s1.L8, prizeMoney);
  }

  f1040s1.L9 = math.add(
    f1040s1.L1,  // taxable refunds/credits/offsets
    f1040s1.L2a, // alimony recieved
    f1040s1.L3,  // business income (f1040sc)
    f1040s1.L4,  // other gains (f4797)
    f1040s1.L5,  // rental/s-corp/trust income (f1040se)
    f1040s1.L6,  // farm income (f1040sf)
    f1040s1.L7,  // unemployment compensation
    f1040s1.L8,  // other income
  );
  f1040.L8 = f1040s1.L9;
  log.info(`Total additional income: f1040.L8=${f1040.L8}`);

  ////////////////////////////////////////
  // Part II - Adjustments to  Income

  f1040s1.L22 = math.add(
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
  f1040.L10a = f1040s1.L22;
  log.info(`Total adjustments to income: f1040.L10a=${f1040.L10a}`);

  return { ...forms, f1040, f1040s1 };
};
