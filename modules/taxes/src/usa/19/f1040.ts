import { math } from "@valuemachine/utils";

import { Forms } from "./types";
import { getIncomeTax, logger } from "./utils";

export const f1040 = (oldForms: Forms): Forms => {
  const log = logger.child({ module: "f1040" });
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040, f1040s1, f1040s2, f1040s3, f2555 } = forms;
  if (f1040.length) return forms; // abort if >1 page

  let filingStatus;
  if (f1040.Single || f1040.MarriedFilingSeparately) {
    filingStatus = "single";
  } else if (f1040.MarriedFilingJointly || f1040.QualifiedWidow) {
    filingStatus = "joint";
  } else if (f1040.HeadOfHousehold) {
    filingStatus = "head";
  }

  f1040.L7a = f1040s1.L9;

  f1040.L7b = math.add(
    f1040.L1, f1040.L2b, f1040.L3b, f1040.L4b,
    f1040.L4d, f1040.L5b, f1040.L6, f1040.L7a,
  );

  f1040.L8a = f1040s1.L22;

  f1040.L8b = math.sub(f1040.L7b, f1040.L8a);

  if (f1040.Single || f1040.MarriedFilingSeparately) {
    f1040.L9 = "12200";
  } else if (f1040.MarriedFilingJointly || f1040.QualifiedWidow) {
    f1040.L9 = "24400";
  } else if (f1040.HeadOfHousehold) {
    f1040.L9 = "18350";
  }

  f1040.L11a = math.add(f1040.L9, f1040.L10);

  f1040.L11b = math.subToZero(f1040.L8b, f1040.L11a);
  log.info(`Taxable Income: ${math.round(f1040.L11b)}`);

  if (!forms.f2555) {
    f1040.L12a = getIncomeTax(f1040.L11b, filingStatus);
  } else {
    log.warn(`idk what 2b from Foreign Earned Income Tax Worksheet should be, using 0`);
    const L2c = math.add(f2555.L45, f2555.L50);
    const L3 = math.add(f1040.L11b, math.add());
    const L4 = getIncomeTax(L3, filingStatus);
    const L5 = getIncomeTax(L2c, filingStatus);
    f1040.L12a = math.subToZero(L4, L5);
  }

  f1040.L12b = math.add(f1040s2.L3, f1040.L12a);

  f1040.L13b = math.add(f1040s3.L7, f1040.L13a);

  f1040.L14 = math.subToZero(f1040.L12b, f1040.L13b);
  log.info(`Taxes Paid: ${math.round(f1040.L14)}`);

  f1040.L16 = math.add(f1040.L14, f1040.L15);

  f1040.L18e = math.add(f1040.L18a, f1040.L18b, f1040.L18c, f1040.L18d);

  f1040.L19 = math.add(f1040.L17, f1040.L18e);

  f1040.L20 = math.subToZero(f1040.L19, f1040.L16);

  f1040.L23 = math.subToZero(f1040.L16, f1040.L19);
  log.info(`Taxes Owed: ${math.round(f1040.L23)}`);

  return { ...forms, f1040, f1040s2, f1040s3 };
};
