import {
  Forms,
  Logger,
  math,
  TaxInput,
  TaxRow,
} from "./utils";

export const f1040s2 = (
  forms: Forms,
  input: TaxInput,
  _taxRows: TaxRow[],
  _logger: Logger,
): Forms => {
  const { f1040, f1040s2 } = forms;
  const { personal } = input;

  f1040s2.Name = `${personal?.firstName || ""} ${personal?.lastName || ""}`;
  f1040s2.SSN = personal?.SSN;

  f1040s2.L3 = math.add(f1040s2.L1, f1040s2.L2);
  f1040.L17 = f1040s2.L3;

  f1040s2.L10 = math.add(
    f1040s2.L4, f1040s2.L5, f1040s2.L6, f1040s2.L7a, f1040s2.L7b, f1040s2.L8,
  );
  f1040.L23 = f1040s2.L10;

  return { ...forms, f1040, f1040s2 };
};
