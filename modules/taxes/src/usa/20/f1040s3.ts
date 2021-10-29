import {
  EventTypes,
  Forms,
  Logger,
  math,
  TaxInput,
  TaxRow,
} from "./utils";

export const f1040s3 = (
  forms: Forms,
  input: TaxInput,
  taxRows: TaxRow[],
  logger: Logger,
): Forms => {
  const log = logger.child({ module: "f1040s3" });
  const { f1040, f1040s3 } = forms;
  const { personal } = input;

  f1040s3.Name = `${personal?.firstName} ${personal?.middleInitial} ${personal?.lastName}`;
  f1040s3.SSN = personal?.SSN;

  f1040s3.L7 = math.add(
    f1040s3.L1, f1040s3.L2, f1040s3.L3,
    f1040s3.L4, f1040s3.L5, f1040s3.L6,
  ); 
  f1040.L20 = f1040s3.L7;

  taxRows
    .filter(tax => tax.action === EventTypes.Trade)
    .filter((tax: TaxRow) => tax.tags.includes("f1040s3.L8"))
    .forEach((tax: TaxRow) => {
      log.info(`Including tax payment of ${tax.amount} on ${tax.date}`);
      f1040s3.L8 = math.add(f1040s3.L8, tax.amount);
    });

  f1040s3.L13 = math.add(
    f1040s3.L8, f1040s3.L9, f1040s3.L10,
    f1040s3.L11, f1040s3.L12a, f1040s3.L12b,
    f1040s3.L12c, f1040s3.L12d, f1040s3.L12e,
  ); 
  f1040.L31 = f1040s3.L13;

  return { ...forms, f1040, f1040s3 };
};
