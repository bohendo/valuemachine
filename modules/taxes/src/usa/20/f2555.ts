import {
  DateString,
  IncomeTypes,
  IntString,
  Logger,
  TaxActions,
  TaxInput,
  TaxRow,
} from "@valuemachine/types";

import {
  after,
  isBusinessExpense,
  before,
  Forms,
  getTotalValue,
  guard,
  math,
  strcat,
  thisYear,
  toFormDate,
} from "./utils";

const USA = guard;

export const f2555 = (
  forms: Forms,
  input: TaxInput,
  taxRows: TaxRow[],
  logger: Logger,
): Forms => {
  const log = logger.child({ module: "f2555" });
  const { f2555, f1040, f1040s1 } = forms;
  const personal = input.personal || {};
  const travel = input.travel || [];

  // If no travel info, then omit this form
  if (!travel) { delete forms.f2555; return forms; }

  f2555.Name = strcat([personal.firstName, personal.lastName]);
  f2555.SSN = personal.SSN;

  ////////////////////////////////////////
  // Part I: General Info

  f2555.L1 = strcat([personal.foreignState, personal.foreignZip, personal.foreignCountry], ", ");

  f2555.L2 = personal.occupation;
  const employer = personal.employer;
  if (employer) {
    f2555.L3 = employer.name;
    if (employer.country === guard) {
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
  // Part II: Bona Fide Residence Test

  // Remove this form if we are explicitly disqualified from being a bona fide resident
  if (f2555.C13a_Yes && f2555.C13b_No) {
    delete forms.f2555;
    return forms;
  }

  ////////////////////////////////////////
  // Part III: Physical Presence Test

  f2555.L16_From = toFormDate("2020-01-01");
  f2555.L16_To = toFormDate("2020-12-31");

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = (d1: DateString, d2: DateString): IntString =>
    Math.trunc(Math.abs(
      new Date(`${d1}T00:00:00Z`).getTime() - new Date(`${d2}T00:00:00Z`).getTime()
    ) / msPerDay).toString();

  const daysInEachCountry = travel.reduce((days, trip) => ({
    ...days,
    [trip.country]: math.add(days[trip.country] || "0", diffDays(trip.enterDate, trip.leaveDate))
  }), {});

  log.info(`Days present by country: ${JSON.stringify(daysInEachCountry)}`);

  const daysOutOfUSA = Object.keys(daysInEachCountry).reduce((tot, country) => {
    return country !== USA ? math.add(tot, daysInEachCountry[country]) : tot;
  }, "0");

  if (math.lt(daysOutOfUSA, "330")) {
    log.info(`Physical presence test failed: ${daysOutOfUSA} < 330 days out of the USA`);
    delete forms.f2555;
    return forms;
  } else {
    log.info(`Physical presence test passed: ${daysOutOfUSA} >= 330 days out of the USA`);
  }

  f2555.L17 = Object.keys(daysInEachCountry).reduce((max, country) => {
    if (country === USA) return max;
    if (!max) return country;
    return math.gt(daysInEachCountry[country], daysInEachCountry[max]) ? country : max;
  }, "");

  for (const i of [0, 1, 2, 3]) {
    if (!travel[i]) continue;
    const trip = travel[i];
    f2555[`L18a_R${i+1}`] = trip.country;
    f2555[`L18b_R${i+1}`] = toFormDate(trip.enterDate);
    f2555[`L18c_R${i+1}`] = toFormDate(trip.leaveDate);
    f2555[`L18d_R${i+1}`] = trip.country !== USA ? diffDays(trip.enterDate, trip.leaveDate) : "0";
    f2555[`L18e_R${i+1}`] = trip.country === USA ? diffDays(trip.enterDate, trip.leaveDate) : "0";
    f2555[`L18f_R${i+1}`] = trip.usaIncomeEarned;
  }

  ////////////////////////////////////////
  // Part IV: All Tax Payers

  const wasInUSA = row => !travel.find(trip =>
    trip.country === guard
    && before(trip.enterDate, row.date)
    && after(trip.leaveDate, row.date)
  );

  // Get all income earned while outside the US
  f2555.L19 = getTotalValue(
    taxRows.filter(wasInUSA).filter(thisYear),
    TaxActions.Income,
    { incomeType: IncomeTypes.Wage },
  );

  f2555.L23 = math.sub(
    getTotalValue(
      taxRows.filter(wasInUSA).filter(thisYear),
      TaxActions.Income,
      { incomeType: IncomeTypes.SelfEmployed },
    ),
    getTotalValue(taxRows.filter(thisYear).filter(isBusinessExpense)),
  );

  f2555.L24 = math.add(
    f2555.L19,  // total wages
    f2555.L20a, // share of income from business
    f2555.L20b, // share of income from partnerships
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

  ////////////////////////////////////////
  // Part V: All Tax Payers

  f2555.L27 = f2555.L26;

  ////////////////////////////////////////
  // Part VI: Housing Exclusion

  f2555.L30 = math.min(f2555.L28, f2555.L29b);

  f2555.L31 = daysOutOfUSA;

  f2555.L32 = math.eq(f2555.L31, "366") ? "16944" : math.mul(f2555.L31, "46.42");

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

  f2555.L37 = "107600";

  f2555.L38 = daysOutOfUSA;

  const L39 = math.round(math.div(daysOutOfUSA, "366"), 3);
  f2555.L39_int = L39.split(".")[0];
  f2555.L39_dec = L39.split(".")[1];

  f2555.L40 = math.mul(f2555.L37, L39);
  f2555.L41 = math.subToZero(f2555.L27, f2555.L36);
  f2555.L42 = math.min(f2555.L40, f2555.L41);
  log.info(`Foreign earned income exclusion: f2555.L42=${f2555.L42}`);

  ////////////////////////////////////////
  // Part VIII: Sum Exclusions

  f2555.L43 = math.add(f2555.L36, f2555.L42);

  if (f2555.L44 === "") {
    log.warn(`Required but not implemented or provided: f2555.L44`);
  }

  f2555.L45 = math.sub(f2555.L43, f2555.L44);

  if (!math.eq(f2555.L45, "0")) {
    f1040s1.L8_Etc2 = strcat([f1040s1.L8_Etc2, `Form2555=(${math.round(f2555.L45)})`], ", ");
  }
  f1040s1.L8 = math.sub(f1040s1.L8, f2555.L45);
  f1040s1.L9 = math.add(
    f1040s1.L1, f1040s1.L2a, f1040s1.L3, f1040s1.L4,
    f1040s1.L5, f1040s1.L6, f1040s1.L7, f1040s1.L8,
  );

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
    if (math.gt(f2555.L50, "0")) {
      log.warn(`You're supposed to write "f2555 ${f2555.L50}" to the left of f1040s1.L22 lol`);
    }
    f1040s1.L22 = math.add(f1040s1.L22, f2555.L50);
    log.info(`Foreign housing deduction: ${f2555.L50}`);

  }

  return { ...forms, f2555, f1040 };
};
