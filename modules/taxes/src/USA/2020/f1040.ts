import {
  DecString,
  FilingStatuses,
  IncomeType,
  IncomeTypes,
  Logger,
  TaxActions,
  TaxInput,
  TaxRows,
} from "@valuemachine/types";

import {
  Forms,
  getIncomeTax,
  getTotalValue,
  getTotalIncome,
  getTotalTaxableIncome,
  math,
  strcat,
  thisYear,
} from "./utils";

export const f1040 = (
  forms: Forms,
  input: TaxInput,
  taxRows: TaxRows,
  logger: Logger,
): Forms => {
  const log = logger.child({ module: "f1040" });
  const { f1040, f1040sd, f2555 } = forms;
  const personal = input.personal || {};
  const { filingStatus } = personal;

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

  const sumIncome = (incomeType: IncomeType): DecString =>
    getTotalValue(taxRows.filter(thisYear), TaxActions.Income, { incomeType });

  f1040.L1 = sumIncome(IncomeTypes.Wage);
  f1040.L2b = sumIncome(IncomeTypes.Interest);
  f1040.L3b = sumIncome(IncomeTypes.Dividend);
  f1040.L4b = sumIncome(IncomeTypes.IRA);
  f1040.L5b = sumIncome(IncomeTypes.Pension);
  f1040.L6b = sumIncome(IncomeTypes.SocialSecurity);

  if (!("f1040sd" in forms)) {
    f1040.C7 = true;
  }

  f1040.L2b = getTotalValue(
    taxRows.filter(thisYear),
    TaxActions.Income,
    { incomeType: IncomeTypes.Interest },
  );
  f1040.L2b = getTotalValue(
    taxRows.filter(thisYear),
    TaxActions.Income,
    { incomeType: IncomeTypes.Dividend },
  );

  f1040.L9 = math.add(
    f1040.L1,  // wages
    f1040.L2b, // taxable interest (f1040sb?)
    f1040.L3b, // taxable dividends (f1040sb?)
    f1040.L4b, // IRA distributions
    f1040.L5b, // pensions & annuities
    f1040.L6b, // taxable social security benefits
    f1040.L7,  // capital gain/loss (f1040sd)
    f1040.L8,  // other income (f1040s1)
  );
  log.info(`Total income: f1040.L9=${f1040.L9}`);
  const totalIncome = getTotalIncome(input, taxRows);
  if (totalIncome !== f1040.L9)
    log.warn(`DOUBLE_CHECK_FAILED: f1040.L9=${f1040.L9} !== ${totalIncome}`);

  f1040.L10c = math.add(
    f1040.L10a, // income adjustments from f1040s1
    f1040.L10b, // charitable deductions
  );
  log.info(`Total income adjustments: f1040.L10c=${f1040.L10c}`);

  f1040.L11 = math.sub(
    f1040.L9,   // total income
    f1040.L10c, // total adjustments
  );
  log.info(`Total gross income: f1040.L11=${f1040.L11}`);

  f1040.L12 =
    (filingStatus === FilingStatuses.Joint || filingStatus === FilingStatuses.Widow) ? "24400"
    : (filingStatus === FilingStatuses.Head) ? "18350"
    : "12200";

  f1040.L14 = math.add(
    f1040.L12, // standard deduction
    f1040.L13, // qualified business income deduction
  );

  f1040.L15 = math.subToZero(
    f1040.L11, // adjusted gross income
    f1040.L14, // total deductions
  );
  log.info(`Total Taxable Income: f1040.L15=${f1040.L15}`);
  const totalTaxableIncome = getTotalTaxableIncome(input, taxRows);
  if (totalTaxableIncome !== f1040.L15)
    log.warn(`DOUBLE_CHECK_FAILED: f1040.L15=${f1040.L15} !== ${totalTaxableIncome}`);

  ////////////////////////////////////////
  // Taxes due & payments

  if ("f8814" in forms) f1040.C16_1 = true;
  if ("4972" in forms) f1040.C16_2 = true;

  if (forms.f2555) {
    const ws = {} as any; // Foreign Earned Income Tax Worksheet on i1040 pg 35
    ws.L1 = f1040.L15;
    ws.L2a = math.add(f2555.L45, f2555.L50);
    ws.L2b = "0"; // unapplied deducation & exclusions due to foreign earned income exclusion
    ws.L2c = math.subToZero(ws.L2a, ws.L2b);
    ws.L3 = math.add(ws.L1, ws.L2c);
    ws.L4 = getIncomeTax(ws.L3, filingStatus);
    ws.L5 = getIncomeTax(ws.L2c, filingStatus);
    f1040.L16 = math.subToZero(ws.L4, ws.L5);

  } else if (f1040sd && (math.gt(f1040sd.L18, "0") || math.gt(f1040sd.L19, "0"))) {
    throw new Error(`NOT_IMPLEMENTED: Schedule D Tax Worksheet`);

  } else if (f1040sd) {
    throw new Error(`NOT_IMPLEMENTED: Qualified Dividends and Capital Gain Tax Worksheet`);

  } else {
    f1040.L16 = getIncomeTax(f1040.L11, filingStatus);
  }

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
  f1040.L24 = math.add(
    f1040.L22, // total tax liabilities
    f1040.L23, // other taxes from f1040s2
  );
  log.info(`Total taxes: f1040.L24=${f1040.L24}`);

  f1040.L25d = math.add(
    f1040.L25a, // taxes withheld from wages (W-2)
    f1040.L25b, // taxes withheld from self employment (f1099)
    f1040.L25c, // other taxes withheld
  );
  f1040.L32 = math.add(
    f1040.L27, // earned income credit
    f1040.L28, // extra child tax credit (f8812)
    f1040.L29, // american opportunity credit (f8863)
    f1040.L30, // recovery rebate credit
    f1040.L31, // payments from f1040se
  );
  log.info(`Total payments & credits: f1040.L32=${f1040.L32}`);

  f1040.L33 = math.add(
    f1040.L25d, // total tax withholdings
    f1040.L26,  // estimated payments & amount applied from 2019 return
    f1040.L32,  // total payments & credits
  );
  log.info(`Total tax payments: f1040.L33=${f1040.L33}`);

  if (math.gt(f1040.L33, f1040.L24)) {
    f1040.L34 = math.sub(f1040.L33, f1040.L24);
    log.info(`Total tax refund: f1040.L34=${f1040.L34}`);
  } else if (math.lt(f1040.L33, f1040.L24)) {
    f1040.L37 = math.sub(f1040.L24, f1040.L33);
    log.info(`Total tax owed: f1040.L37=${f1040.L37}`);
  }

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
