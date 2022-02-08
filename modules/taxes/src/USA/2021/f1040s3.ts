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
  const log = logger.child({ name: "f1040s3" });
  const { f1040, f1040s3 } = forms;
  const personal = input.personal || {};

  f1040s3.Name = strcat([personal.firstName, personal.lastName]);
  f1040s3.SSN = personal.SSN;

  ////////////////////////////////////////
  // Part I - Nonrefundable Credits

  f1040s3.L7 = math.add(
    f1040s3.L6a, // general business credit. Attach Form 3800
    f1040s3.L6b, // credit for prior year minimum tax. Attach Form 8801
    f1040s3.L6c, // adoption credit. Attach Form 8839
    f1040s3.L6d, // credit for the elderly or disabled. Attach Schedule R
    f1040s3.L6e, // alternative motor vehicle credit. Attach Form 8910
    f1040s3.L6f, // qualified plug-in motor vehicle credit. Attach Form 8936
    f1040s3.L6g, // mortgage interest credit. Attach Form 8396
    f1040s3.L6h, // district of Columbia first-time homebuyer credit. Attach Form 8859
    f1040s3.L6i, // qualified electric vehicle credit. Attach Form 8834
    f1040s3.L6j, // alternative fuel vehicle refueling property credit. Attach Form 8911
    f1040s3.L6k, // credit to holders of tax credit bonds. Attach Form 8912
    f1040s3.L6l, // amount on f8978.L14
    f1040s3.L6z, // other nonrefundable credits
  );

  f1040s3.L8 = math.add(
    f1040s3.L1, // foreign tax credit from f1116
    f1040s3.L2, // child care credit from f2441
    f1040s3.L3, // education credit from f8863
    f1040s3.L4, // retirement savings credit from f8880
    f1040s3.L5, // residential energy credit from f5695
    f1040s3.L7, // other credits
  ); 
  f1040.L20 = f1040s3.L8;
  log.info(`Total nonrefundable credits: f1040.L20=${f1040.L20}`);

  ////////////////////////////////////////
  // Part II - Other Payments and Refundable Credits

  f1040s3.L14 = math.add(
    f1040s3.L13a, // f2439
    f1040s3.L13b, // qualified sick and family leave credits from f1040sh & f7202 before 210101
    f1040s3.L13c, // health coverage tax credit from Form 8885
    f1040s3.L13d, // credit for repayment of amounts included in income from earlier years
    f1040s3.L13f, // deferred amount of net 965 tax liability
    f1040s3.L13g, // credit for child and dependent care expenses from f2441.L10
    f1040s3.L13h, // qualified sick and family leave credits from f1040sh & f7202 after 210331
    f1040s3.L13z, // other refundable credits
  );

  f1040s3.L15 = math.add(
    f1040s3.L9,  // net premium tax credit from f8962
    f1040s3.L10, // amount paid with request for extension to file
    f1040s3.L11, // excess social security & RRTA withholding from f843
    f1040s3.L12, // fuel credit from f4136
    f1040s3.L14, // other refundable credits
  ); 
  f1040.L31 = f1040s3.L15;
  log.info(`Total payments & refundable credits: f1040.L31=${f1040.L31}`);

  // If relevant values are all zero, don't file this form
  if (math.eq(f1040s3.L8, "0") && math.eq(f1040s3.L15, "0")) {
    delete forms.f1040s3;
    return forms;
  } else {
    return { ...forms, f1040, f1040s3 };
  }

};
