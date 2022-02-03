import { DecString, Logger } from "@valuemachine/types";

import { nextYear, thisYear } from "./const";
import {
  FilingStatuses,
  Forms,
  ExpenseTypes,
  getIncomeTax,
  getStandardDeduction,
  getTotalCapitalChange,
  getTotalDeductions,
  getTotalGrossIncome,
  getTotalIncome,
  getTotalIncomeAdjustments,
  getTotalTax,
  getTotalTaxableIncome,
  IncomeType,
  IncomeTypes,
  math,
  strcat,
  sumExpenses,
  sumIncome,
  TaxInput,
  TaxRows,
} from "./utils";

export const f1040 = (
  forms: Forms,
  input: TaxInput,
  rows: TaxRows,
  logger: Logger,
): Forms => {
  const log = logger.child({ name: "f1040" });
  const f1040 = forms.f1040 || {};
  const personal = input.personal || {};
  const filingStatus = personal.filingStatus || "";

  ////////////////////////////////////////
  // Personal Info

  if (filingStatus === FilingStatuses.Single) f1040.Single = true;
  if (filingStatus === FilingStatuses.Separate) f1040.MarriedSeparate = true;
  if (filingStatus === FilingStatuses.Joint) f1040.MarriedJoint = true;
  if (filingStatus === FilingStatuses.Widow) f1040.Widow = true;
  if (filingStatus === FilingStatuses.Head) f1040.HeadOfHousehold = true;

  f1040.FirstNameMI = strcat([personal.firstName, personal.middleInitial]);
  f1040.LastName = personal.lastName;
  f1040.SSN = personal.SSN;
  f1040.StreetAddress = personal.streetAddress;
  f1040.Apt = personal.apt;
  f1040.City = personal.city;
  f1040.State = personal.state;
  f1040.Zip = personal.zip;
  f1040.ForeignCountry = personal.foreignCountry;
  f1040.ForeignState = personal.foreignState;
  f1040.ForeignZip = personal.foreignZip;

  if (filingStatus === FilingStatuses.Joint) {
    f1040.SpouseFirstNameMI = strcat([personal.spouseFirstName, personal.spouseMiddleInitial]);
    f1040.SpouseLastName = personal.spouseLastName;
    f1040.SpouseSSN = personal.spouseSSN;
  }

  ////////////////////////////////////////
  // Taxable Income

  const getIncome = (incomeType: IncomeType, exempt?: boolean): DecString =>
    sumIncome(thisYear, rows.filter(row => !exempt || row.tag.exempt === exempt), incomeType);

  f1040.L1 = getIncome(IncomeTypes.Wage);
  f1040.L2a = getIncome(IncomeTypes.Interest, true);
  f1040.L2b = getIncome(IncomeTypes.Interest);
  f1040.L3a = getIncome(IncomeTypes.Dividend, true);
  f1040.L3b = getIncome(IncomeTypes.Dividend);
  f1040.L4a = getIncome(IncomeTypes.IRA, true);
  f1040.L4b = getIncome(IncomeTypes.IRA);
  f1040.L5a = getIncome(IncomeTypes.Pension, true);
  f1040.L5b = getIncome(IncomeTypes.Pension);
  f1040.L6a = getIncome(IncomeTypes.SocialSecurity, true);
  f1040.L6b = getIncome(IncomeTypes.SocialSecurity);

  if (!("f1040sd" in forms)) {
    f1040.C7 = true;
  }

  f1040.L7 = getTotalCapitalChange(thisYear, input, rows);
  f1040.L9 = getTotalIncome(thisYear, input, rows);
  log.info(`Total income: f1040.L9=${f1040.L9}`);

  const L9 = math.add(
    f1040.L1,  // wages
    f1040.L2b, // taxable interest (f1040sb?)
    f1040.L3b, // taxable dividends (f1040sb?)
    f1040.L4b, // IRA distributions
    f1040.L5b, // pensions & annuities
    f1040.L6b, // taxable social security benefits
    f1040.L7,  // capital gain/loss (f1040sd)
    f1040.L8,  // other income (f1040s1)
  );
  if (!math.eq(L9, f1040.L9))
    log.warn(`DOUBLE_CHECK_FAILED: sum(L1-L8)=${L9} !== f1040.L9=${f1040.L9}`);

  f1040.L10 = getTotalIncomeAdjustments(thisYear, rows);
  log.info(`Total income adjustments: f1040.L10=${f1040.L10}`);

  f1040.L11 = getTotalGrossIncome(thisYear, input, rows);
  log.info(`Total gross income: f1040.L11=${f1040.L11}`);
  const L11 = math.sub(
    f1040.L9,   // total income
    f1040.L10, // total adjustments
  );
  if (!math.eq(f1040.L11, L11))
    log.warn(`DOUBLE_CHECK_FAILED: L9-L10=${L11} !== f1040.L11=${f1040.L11}`);

  f1040.L12a = getStandardDeduction(input);
  const L12c = math.add(
    f1040.L12a, // income adjustments from f1040s1
    f1040.L12b, // charitable deductions
  );
  if (!math.eq(f1040.L12c, L12c))
    log.warn(`DOUBLE_CHECK_FAILED: sum(L12a-L12b)=${L12c} !== f1040.L12c=${f1040.L12c}`);

  // All deductions
  f1040.L14 = getTotalDeductions(input);
  log.info(`Total deductions: f1040.L14=${f1040.L14}`);
  const L14 = math.add(
    f1040.L12c, // standard deduction
    f1040.L13, // qualified business income deduction
  );
  if (!math.eq(f1040.L14, L14))
    log.warn(`DOUBLE_CHECK_FAILED: sum(L12c-L13)=${L14} !== f1040.L14=${f1040.L14}`);

  f1040.L15 = getTotalTaxableIncome(thisYear, input, rows);
  log.info(`Total Taxable Income: f1040.L15=${f1040.L15}`);
  const L15 = math.subToZero(
    f1040.L11, // adjusted gross income
    f1040.L14, // total deductions
  );
  log.info(`f1040.L11=${f1040.L11}`);
  log.info(`f1040.L14=${f1040.L14}`);
  if (!math.eq(f1040.L15, L15))
    log.warn(`DOUBLE_CHECK_FAILED: L11-L14=${L15} !== f1040.L15=${f1040.L15}`);

  ////////////////////////////////////////
  // Taxes due & payments

  if ("f8814" in forms) f1040.C16_1 = true;
  if ("4972" in forms) f1040.C16_2 = true;

  f1040.L16 = getIncomeTax(thisYear, input, rows);

  f1040.L18 = math.add(
    f1040.L16, // Income tax
    f1040.L17, // additional tax from f1040s2
  );
  f1040.L21 = math.add(
    f1040.L19, // dependent tax credit
    f1040.L20, // additional tax credits from f1040s3
  );
  f1040.L22 = math.subToZero(
    f1040.L18, // total tax credits
    f1040.L21, // tax liabilities
  );

  f1040.L24 = getTotalTax(thisYear, input, rows);
  log.info(`Total Tax: f1040.L24=${f1040.L24}`);
  const L24 = math.add(
    f1040.L22, // total tax liabilities
    f1040.L23, // other taxes from f1040s2
  );
  if (!math.eq(L24, f1040.L24))
    log.warn(`DOUBLE_CHECK_FAILED: sum(L22-L23)=${L24} !== f1040.L24=${f1040.L24}`);

  f1040.L25d = math.add(
    f1040.L25a, // taxes withheld from wages (W-2)
    f1040.L25b, // taxes withheld from self employment (f1099)
    f1040.L25c, // other taxes withheld
  );

  f1040.L26 = sumExpenses(thisYear, rows, ExpenseTypes.Tax);

  f1040.L32 = math.add(
    f1040.L27a, // earned income credit
    f1040.L28, // extra child tax credit (f8812)
    f1040.L29, // american opportunity credit (f8863)
    f1040.L30, // recovery rebate credit
    f1040.L31, // payments from f1040se
  );
  log.info(`Total tax credits & certain tax payments: f1040.L32=${f1040.L32}`);

  f1040.L33 = math.add(
    f1040.L25d, // total tax withholdings
    f1040.L26,  // estimated payments & amount applied from 2019 return
    f1040.L32,  // total payments & credits
  );

  if (math.gt(f1040.L33, f1040.L24)) {
    f1040.L34 = math.sub(f1040.L33, f1040.L24);
  } else if (math.lt(f1040.L33, f1040.L24)) {
    f1040.L37 = math.sub(f1040.L24, f1040.L33);
  }

  // Add late tax payments made during the following tax year to estimated tax payments
  if (math.gt(f1040.L37, "0")) {
    const latePayments = math.min(
      sumExpenses(nextYear, rows, ExpenseTypes.Tax),
      f1040.L37,
    );
    if (math.gt(latePayments, "0")) {
      log.info(`A late payment of ${latePayments} was detected, re-calculating taxes due..`);
      f1040.L26 = math.add(f1040.L26, latePayments);
      // Recalculate everything after L26
      f1040.L33 = math.add(
        f1040.L25d, // total tax withholdings
        f1040.L26,  // estimated payments & amount applied from 2019 return
        f1040.L32,  // total payments & credits
      );
      f1040.L37 = math.subToZero(f1040.L37, latePayments);
    }
  }

  log.info(`Total tax payments: f1040.L33=${f1040.L33}`);
  log.info(`Total tax refund: f1040.L34=${f1040.L34}`);
  log.info(`Total tax owed: f1040.L37=${f1040.L37}`);

  ////////////////////////////////////////
  // More Personal Info

  if (personal.thirdParty?.name) {
    f1040.DesignateThirdParty_Yes = true;
    f1040.ThirdPartyName = personal.thirdParty.name;
    f1040.ThirdPartyPhone = personal.thirdParty.phone;
    f1040.ThirdPartyPin = personal.thirdParty.pin;
  } else {
    f1040.DesignateThirdParty_No = true;
  }

  f1040.Occupation = personal.occupation;
  f1040.PIN = personal.pin;
  f1040.Phone = personal.phone;
  f1040.Email = personal.email;

  if (filingStatus === FilingStatuses.Joint) {
    f1040.SpouseOccupation = personal.spouseOccupation;
    f1040.SpousePIN = personal.spousePin;
  }

  if (personal.preparer?.name) {
    f1040.PreparerName = personal.preparer.name;
    f1040.PreparerPTIN = personal.preparer.ptin;
    f1040.PreparerSelfEmployed = personal.preparer.isSelfEmployed;
    f1040.PreparerFirm = personal.preparer.firmName;
    f1040.PreparerPhone = personal.preparer.phone;
    f1040.PreparerAddress = personal.preparer.firmAddress;
    f1040.PreparerEIN = personal.preparer.firmEIN;
  }

  return { ...forms, f1040 };
};
