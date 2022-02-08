import { Logger } from "@valuemachine/types";

import {
  Forms,
  math,
  strcat,
  TaxInput,
  TaxRows,
} from "./utils";

export const f1040s2 = (
  forms: Forms,
  input: TaxInput,
  rows: TaxRows,
  logger: Logger,
): Forms => {
  const log = logger.child({ name: "f1040s2" });
  const { f1040, f1040s2 } = forms;
  const personal = input.personal || {};

  f1040s2.Name = strcat([personal.firstName, personal.lastName]);
  f1040s2.SSN = personal.SSN;

  ////////////////////////////////////////
  // Part I - Tax

  f1040s2.L3 = math.add(
    f1040s2.L1, // alt min tax from f6251
    f1040s2.L2, // excess tax repayment from f8962
  );
  f1040.L17 = f1040s2.L3;
  log.info(`Additional taxes: f1040.L17=${f1040.L17}`);

  ////////////////////////////////////////
  // Part II - Additional Taxes

  // Total social security taxes
  f1040s2.L7 = math.add(
    f1040s2.L5,  // unreported social security from f4137/f8919
    f1040s2.L6,  // reported social security from f4137/f8919
  );

  f1040s2.L18 = math.add(
    f1040s2.L17a, // recapture of other credits.
    f1040s2.L17b, // recapture of federal mortgage subsidy.
    f1040s2.L17c, // additional tax on HSA distributions. Attach Form 8889
    f1040s2.L17d, // additional tax on an HSA because you didn’t remain eligible. Attach Form 8889
    f1040s2.L17e, // additional tax on Archer MSA distributions. Attach Form 8853
    f1040s2.L17f, // additional tax on Medicare Advantage MSA distributions. Attach Form 8853
    f1040s2.L17g, // recapture of a charitable contribution deduction
    f1040s2.L17h, // income received from nonqualified deferred comp plan (section 409A)
    f1040s2.L17i, // compensation received from nonqualified deferred comp plan (section 457A)
    f1040s2.L17j, // section 72(m)(5) excess benefits tax
    f1040s2.L17k, // golden parachute payments
    f1040s2.L17l, // tax on accumulation distribution of trusts
    f1040s2.L17m, // excise tax on insider stock compensation from an expatriated corporation
    f1040s2.L17n, // look-back interest under section 167(g) or 460(b) from Form 8697 or 8866
    f1040s2.L17o, // tax on disconnected income for time as a nonresident alien from f1040-NR
    f1040s2.L17p, // any interest from f8621.L16f
    f1040s2.L17q, // any interest from f8621.L24
    f1040s2.L17z, // other tax
  );

  f1040s2.L21 = math.add(
    f1040s2.L4,  // self employment tax from f1040sse
    f1040s2.L7,  // total social security tax
    f1040s2.L8,  // Additional tax on IRAs or other tax-favored accounts from f5329
    f1040s2.L9,  // Household employment taxes. Attach Schedule H
    f1040s2.L10, // Repayment of first-time homebuyer credit. Attach Form 5405 if required
    f1040s2.L11, // Additional Medicare Tax. Attach Form 8959
    f1040s2.L12, // Net investment income tax. Attach Form 8960
    f1040s2.L13, // Uncollected social security and Medicare or RRTA tax on tips (W-2 box 12)
    f1040s2.L14, // Interest on income tax from the sale of certain residential lots and timeshares
    f1040s2.L15, // Interest on deferred tax from certain installment sales >$150,000
    f1040s2.L16, // Recapture of low-income housing credit. Attach Form 8611
    f1040s2.L18, // Total additional taxes
    f1040s2.L19, // Additional tax from Schedule 8812
  );
  f1040.L23 = f1040s2.L21;
  log.info(`Total other taxes: f1040.L23=${f1040.L23}`);

  // If relevant values are all zero, don't file this form
  if (math.eq(f1040s2.L3, "0") && math.eq(f1040s2.L21, "0")) {
    delete forms.f1040s2;
    return forms;
  } else {
    return { ...forms, f1040, f1040s2 };
  }

};
