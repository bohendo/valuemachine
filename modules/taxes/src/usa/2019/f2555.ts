import { Event, ExpenseEvent, IncomeEvent } from "@finances/types";
import { math } from "@finances/utils";

import { Forms } from "../types";
import { logger, processExpenses, processIncome } from "../utils";

export const f2555 = (vmEvents: Event[], oldForms: Forms): Forms => {
  const log = logger.child({ module: "f2555" });
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f2555, f1040, f1040s1 } = forms;

  f2555.FullName = `${forms.f1040.FirstNameMI} ${forms.f1040.LastName}`;
  f2555.SSN = forms.f1040.SocialSecurityNumber;

  ////////////////////////////////////////
  // Part I

  if (f2555.C5c) {
    f2555.L3 = `${forms.f1040.FirstNameMI} ${forms.f1040.LastName}`;
    f2555.L4a = `${forms.f1040.StreetAddress} ${forms.f1040.CityStateZip}`;
    f2555.L4b = f2555.L1;
  }

  ////////////////////////////////////////
  // Part IV

  f2555.L19 = f1040.L1;

  let totalIncome = "0";
  let totalExpenses = "0";
  processIncome(vmEvents, (income: IncomeEvent, value: string): void => {
    totalIncome = math.add(totalIncome, value);
  });
  processExpenses(vmEvents, (expense: ExpenseEvent, value: string): void => {
    if (expense.tags.some(tag => tag.startsWith("f1040sc"))) {
      totalExpenses = math.add(totalExpenses, value);
    }
  });
  f2555.L23 = math.round(math.sub(totalIncome, totalExpenses));

  f2555.L24 = math.add(
    f2555.L19, f2555.L20a, f2555.L20b,
    f2555.L21a, f2555.L21b, f2555.L21c,
    f2555.L21d, f2555.L22g, f2555.L23,
  );

  f2555.L26 = math.sub(f2555.L24, f2555.L25);
  log.info(`2019 foreign earned income: ${f2555.L26}`);

  ////////////////////////////////////////
  // Part V

  f2555.L27 = f2555.L26;

  ////////////////////////////////////////
  // Part VI

  f2555.L30 = math.lt(f2555.L28, f2555.L29b) ? f2555.L28 : f2555.L29b;

  f2555.L32 = math.eq(f2555.L31, "365") ? "16944" : math.mul(f2555.L31, "46.42");

  f2555.L33 = math.subToZero(f2555.L30, f2555.L32);

  if (math.gt(f2555.L33, "0")) {
    const L35 = math.round(math.min(math.div(f2555.L34, f2555.L27), "1"), 3);
    f2555.L35_int = L35.split(".")[0];
    f2555.L35_dec = L35.split(".")[1];

    f2555.L36 = math.min(math.mul(f2555.L33, L35), f2555.L34);
    log.info(`Foreign housing exclusion: ${f2555.L36}`);
  }

  ////////////////////////////////////////
  // Part VII

  f2555.L37 = "105900";

  // TODO: deal w leap years
  const L39 = math.round(math.div(f2555.L38, "365"), 3);
  f2555.L39_int = L39.split(".")[0];
  f2555.L39_dec = L39.split(".")[1];

  f2555.L40 = math.mul(f2555.L37, L39);
  f2555.L41 = math.subToZero(f2555.L27, f2555.L36);
  f2555.L42 = math.min(f2555.L40, f2555.L41);

  f2555.L43 = math.add(f2555.L36, f2555.L42);


  log.info(`Foreign earned income exclusion: ${f2555.L42}`);

  ////////////////////////////////////////
  // Part VIII

  f2555.L43 = math.add(f2555.L36, f2555.L42);

  if (f2555.L44 === "") {
    log.warn(`Required but not implemented or provided: f2555.L44`);
  }

  f2555.L45 = math.sub(f2555.L43, f2555.L44);

  // TODO: concat strings better
  f1040s1.L8R2 += `Form 2555 (${f2555.L45})`;
  f1040s1.L8 = math.sub(f1040s1.L8, f2555.L45);
  f1040s1.L9 = math.round(math.add(
    f1040s1.L1, f1040s1.L2a, f1040s1.L3, f1040s1.L4,
    f1040s1.L5, f1040s1.L6, f1040s1.L7, f1040s1.L8,
  ));

  ////////////////////////////////////////
  // Part IX

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
    f1040.L8a = math.add(f1040.L8a, f2555.L50);
    log.info(`Foreign housing deduction: ${f2555.L50}`);

  }

  return { ...forms, f2555, f1040 };
};
