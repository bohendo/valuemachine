import { Logger } from "@valuemachine/types";

import { thisYear } from "./const";
import {
  after,
  before,
  daysThisYear,
  diffDays,
  Forms,
  getDaysAbroad,
  getDaysByCountry,
  getForeignEarnedIncome,
  getForeignEarnedIncomeExclusion,
  getMaxFeie,
  getNetBusinessIncome,
  IncomeTypes,
  math,
  strcat,
  sumIncome,
  TaxInput,
  TaxRows,
  toFormDate,
  USA,
} from "./utils";

export const f2555 = (
  forms: Forms,
  input: TaxInput,
  rows: TaxRows,
  logger: Logger,
): Forms => {
  const log = logger.child({ name: "f2555" });
  const { f2555, f1040s1 } = forms;
  const personal = input.personal || {};
  const travel = input.travel || [];

  // If no travel history, then omit this form
  if (!travel?.length) { delete forms.f2555; return forms; }

  f2555.Name = strcat([personal.firstName, personal.lastName]);
  f2555.SSN = personal.SSN;

  ////////////////////////////////////////
  // Part I: General Info

  f2555.L1 = strcat([personal.foreignState, personal.foreignZip, personal.foreignCountry], ", ");

  f2555.L2 = personal.occupation;
  const employer = personal.employer;
  if (employer) {
    f2555.L3 = employer.name;
    if (employer.country === USA) {
      f2555.L4a = strcat([employer.street, employer.state, employer.country], ", ");
    } else {
      f2555.L4b = strcat([employer.street, employer.state, employer.country], ", ");
    }
    if (employer.type === "ForeignEntity") f2555.C5a = true;
    else if (employer.type === "DomesticCompany") f2555.C5b = true;
    else if (employer.type === "Self") f2555.C5c = true;
    else if (employer.type === "ForeignAffiliate") f2555.C5d = true;
    else if (employer.type) {
      f2555.C5e = true;
      f2555.L5e = employer.type;
    }
  } else {
    f2555.L3 = f2555.Name;
    f2555.L4a = strcat([personal.streetAddress, personal.city, personal.zip], ", ");
    f2555.L4b = strcat([personal.foreignState, personal.foreignZip, personal.foreignCountry], ", ");
    f2555.C5c = true;
  }

  f2555.L6a = ""; // previous year we filed f2555
  if (f2555.L6a) {
    f2555.C6c_Yes = true;
  } else {
    f2555.C6c_No = true;
  }

  // f2555.L6c = have you ever revoked either of the exemptions?
  // f2555.L6d = list all revokations & the year each occured
  // f2555.L7  = what country are you citizen of?
  // f2555.L8a = do you have a 2nd residence bc your tax home is miserable?
  // f2555.L8b = list city,country,days for each 2nd residence & time spent during the tax year
  // f2555.L9  = list your tax homes

  ////////////////////////////////////////
  // Part II: Bona Fide Residence Test - not applicable yet

  ////////////////////////////////////////
  // Part III: Physical Presence Test

  // If/when we allow using a non-standard fiscal year, inject the relevant 12-month period here
  const [yearStart, yearEnd] = [`${thisYear}-01-01`, `${thisYear}-12-31`];
  const daysAbroad = getDaysAbroad(input, yearStart, yearEnd);
  if (math.lt(daysAbroad, "330")) {
    log.info(`Physical presence test failed: ${daysAbroad} < 330 days out of the USA`);
    delete forms.f2555;
    return forms;
  } else {
    log.info(`Physical presence test passed: ${daysAbroad} >= 330 days out of the USA`);
  }

  const daysInEachCountry = getDaysByCountry(input, yearStart, yearEnd);
  log.info(`Days present by country: ${JSON.stringify(daysInEachCountry)}`);

  f2555.L16_From = toFormDate(yearStart);
  f2555.L16_To = toFormDate(yearEnd);
  f2555.L17 = Object.keys(daysInEachCountry).reduce((max, country) => {
    if (country === USA) return max;
    if (!max) return country;
    return math.gt(daysInEachCountry[country], daysInEachCountry[max]) ? country : max;
  }, "");

  if (math.eq(daysAbroad, "")) {
    f2555[`L18a_R1`] = "Physically present in a foreign country";
    f2555[`L18a_R2`] = "for the entire 12-month period.";
  } else {
    let idx = 1;
    for (const i of [0, 1, 2, 3]) {
      const trip = travel[i];
      if (!trip) continue;
      if (after(trip.enterDate, yearEnd)) continue;
      if (before(trip.leaveDate, yearStart)) continue;
      const enterDate = before(trip.enterDate, yearStart) ? yearStart : trip.enterDate;
      const leaveDate = after(trip.leaveDate, yearEnd) ? yearEnd : trip.leaveDate;
      f2555[`L18a_R${idx}`] = trip.country;
      f2555[`L18b_R${idx}`] = toFormDate(enterDate);
      f2555[`L18c_R${idx}`] = toFormDate(leaveDate);
      f2555[`L18d_R${idx}`] = trip.country !== USA ? diffDays(enterDate, leaveDate) : "0";
      f2555[`L18e_R${idx}`] = trip.country === USA ? diffDays(enterDate, leaveDate) : "0";
      f2555[`L18f_R${idx}`] = "0"; // get income by country
      idx += 1;
    }
  }

  ////////////////////////////////////////
  // Part IV: All Tax Payers

  const outOfUSA = row => !travel.find(trip =>
    trip.country === USA
    && before(trip.enterDate, row.date)
    && after(trip.leaveDate, row.date)
  );

  // Get all income earned while outside the US
  f2555.L19 = sumIncome(thisYear, rows.filter(outOfUSA), IncomeTypes.Wage);
  f2555.L23 = getNetBusinessIncome(thisYear, rows.filter(outOfUSA));

  f2555.L24 = math.add(
    f2555.L19,  // total wages
    f2555.L20a, // share of income from personal services via a business
    f2555.L20b, // share of income from personal services via partnerships
    f2555.L21a, // value of provided lodging
    f2555.L21b, // value of provided meals
    f2555.L21c, // value of provided car
    f2555.L21d, // value of other provided stuff
    f2555.L22g, // total allowances & reimbursements
    f2555.L23,  // other foreign earned income
  );

  f2555.L26 = math.sub(
    f2555.L24, // total foreign earned income
    f2555.L25, // excludable meals & lodging
  );
  log.info(`Total Foreign Earned Income: ${f2555.L26}`);
  const foreignEarnedIncome = getForeignEarnedIncome(thisYear, input, rows);
  if (!math.eq(f2555.L26, foreignEarnedIncome))
    log.warn(`DOUBLE_CHECK_FAILED: f2555.L26=${f2555.L26} !== ${foreignEarnedIncome}`);

  ////////////////////////////////////////
  // Part V: All Tax Payers

  f2555.L27 = f2555.L26;

  ////////////////////////////////////////
  // Part VI: Housing Exclusion

  f2555.L30 = math.min(f2555.L28, f2555.L29b);
  f2555.L31 = daysAbroad;
  f2555.L32 = math.eq(daysAbroad, daysThisYear) ? "17216" : math.mul(daysAbroad, "47.04");
  f2555.L33 = math.subToZero(f2555.L30, f2555.L32);
  if (math.gt(f2555.L33, "0")) {
    const L35 = math.min(math.div(f2555.L34, f2555.L27), "1");
    f2555.L35_int = L35.split(".")[0];
    f2555.L35_dec = L35.split(".")[1];
    f2555.L36 = math.min(math.mul(f2555.L33, L35), f2555.L34);
    log.info(`Foreign housing exclusion: ${f2555.L36}`);
  }

  ////////////////////////////////////////
  // Part VII: Income Exclusion

  f2555.L37 = getMaxFeie(thisYear);
  f2555.L38 = daysAbroad;
  const L39 = math.div(daysAbroad, daysThisYear);
  f2555.L39_int = L39.split(".")[0];
  f2555.L39_dec = math.round(L39, 3).split(".")[1];
  f2555.L40 = math.mul(f2555.L37, L39);
  f2555.L41 = math.subToZero(f2555.L27, f2555.L36);
  f2555.L42 = math.min(f2555.L40, f2555.L41);
  log.info(`Foreign earned income exclusion: f2555.L42=${f2555.L42}`);
  const foreignEarnedIncomeExclusion = getForeignEarnedIncomeExclusion(thisYear, input, rows);
  if (!math.eq(f2555.L42, foreignEarnedIncomeExclusion))
    log.warn(`DOUBLE_CHECK_FAILED: f2555.L42=${f2555.L42} !== ${foreignEarnedIncomeExclusion}`);

  ////////////////////////////////////////
  // Part VIII: Sum Exclusions

  f2555.L43 = math.add(f2555.L36, f2555.L42);
  if (f2555.L44 === "") {
    log.warn(`NOT_IMPLEMENTED or provided: f2555.L44`);
  }
  f2555.L45 = math.sub(f2555.L43, f2555.L44);
  f1040s1.L8d = f2555.L45;

  // Recalculate f1040s1 values after adding the foreign income tax deduction
  f1040s1.L9 = math.add(
    f1040s1.L8a, // net operating loss
    f1040s1.L8b, // gambling
    f1040s1.L8c, // cancellation of debt
    f1040s1.L8d, // foreign earned income exclusion from f2555
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
  log.info(`Total RECALCULATED additional income: f1040s1.L9=${f1040s1.L9}`);
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
  log.info(`Total RECALCULATED additional income: f1040s1.L9=${f1040s1.L9}`);

  ////////////////////////////////////////
  // Part IX: Housing Deduction

  if (math.gt(f2555.L33, f2555.L36) && math.gt(f2555.L27, f2555.L43)) {
    f2555.L46 = math.sub(f2555.L33, f2555.L36);
    f2555.L47 = math.sub(f2555.L27, f2555.L43);
    log.info(`${f2555.L27} - ${f2555.L43} = ${f2555.L47}`);
    f2555.L48 = math.min(f2555.L46, f2555.L47);
    if (f2555.L49 === "" && math.gt(f2555.L47, f2555.L48)) {
      log.warn(`Maybe required but not provided or implemented: L49 (Housing Deduction Carryover Worksheet)`);
    }
    f2555.L50 = math.add(f2555.L48, f2555.L49);
    f1040s1.L24j = f2555.L50;
    log.info(`Foreign housing deduction: f1040s1.L24j=${f1040s1.L24j}`);
  }

  return { ...forms, f2555 };
};
