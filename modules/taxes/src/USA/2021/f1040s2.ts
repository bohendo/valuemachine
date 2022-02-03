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
    f1040s2.L1, // alt min tax (f6251)
    f1040s2.L2, // excess tax repayment (f8962)
  );
  f1040.L17 = f1040s2.L3;
  log.info(`Additional taxes: f1040.L17=${f1040.L17}`);

  ////////////////////////////////////////
  // Part II - Additional Taxes

  f1040s2.L10 = math.add(
    f1040s2.L4, // f1040s2.L4  = self employment tax (f1040sse)
    f1040s2.L5, // f1040s2.L5  = Unreported social security (f4137 and/or f8919)
    f1040s2.L6, // f1040s2.L6  = retirement plan taxes (f5329)
    f1040s2.L7a, // f1040s2.L7a = household employment tax (f1040sh)
    f1040s2.L7b, // f1040s2.L7b = first-time homebuyer credit (f5405)
    f1040s2.L8, // f1040s2.L8  = other taxes (from f8959, 8960, etc)
  );
  f1040.L23 = f1040s2.L10;
  log.info(`Total other taxes: f1040.L17=${f1040.L17}`);

  return { ...forms, f1040, f1040s2 };
};
