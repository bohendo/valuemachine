import { Logger } from "@valuemachine/types";

import {
  Forms,
  math,
  strcat,
  TaxInput,
  TaxRows,
} from "./utils";

export const f1040s3 = (
  forms: Forms,
  input: TaxInput,
  rows: TaxRows,
  logger: Logger,
): Forms => {
  const log = logger.child({ module: "f1040s3" });
  const { f1040, f1040s3 } = forms;
  const personal = input.personal || {};

  f1040s3.Name = strcat([personal.firstName, personal.lastName]);
  f1040s3.SSN = personal.SSN;

  ////////////////////////////////////////
  // Part I - Nonrefundable Credits

  f1040s3.L7 = math.add(
    f1040s3.L1, // foreign tax credit (f1116)
    f1040s3.L2, // child care credit (f2441)
    f1040s3.L3, // education credit (f8863)
    f1040s3.L4, // retirement savings credit (f8880)
    f1040s3.L5, // residential energy credit (f5695)
    f1040s3.L6, // Other credits (f3800, f8801, etc)
  ); 
  f1040.L20 = f1040s3.L7;
  log.info(`Total nonrefundable credits: f1040.L20=${f1040.L20}`);

  ////////////////////////////////////////
  // Part II - Other Payments and Refundable Credits

  f1040s3.L12f = math.add(
    f1040s3.L12a, // other (f2439)
    f1040s3.L12b, // sick/family leave credit (f1040sh, f7202)
    f1040s3.L12c, // health coverage credit (f8885)
    f1040s3.L12d, // other
    f1040s3.L12e, // deferral (f1040sh or f1040sse)
  ); 

  f1040s3.L13 = math.add(
    f1040s3.L8,  // Net premium tax credit (f8962)
    f1040s3.L9,  // Request for extension (f4868)
    f1040s3.L10, // excess social security & RRTA withholding (f843)
    f1040s3.L11, // fuel credit (f4136)
    f1040s3.L12f,
  ); 
  f1040.L31 = f1040s3.L13;
  log.info(`Total payments & refundable credits: f1040.L31=${f1040.L31}`);

  return { ...forms, f1040, f1040s3 };
};
