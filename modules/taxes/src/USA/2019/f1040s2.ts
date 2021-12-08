import { Logger } from "@valuemachine/types";

import {
  Forms,
  math,
  TaxRows,
} from "./utils";

export const f1040s2 = (forms: Forms, _taxRows: TaxRows, _logger: Logger): Forms => {
  const { f1040, f1040s2 } = forms;

  f1040s2.Name = `${f1040.FirstNameMI} ${f1040.LastName}`;
  f1040s2.SSN = f1040.SSN;

  f1040s2.L3 = math.round(math.add(f1040s2.L1, f1040s2.L2));
  f1040s2.L10 = math.round(math.add(
    f1040s2.L4, f1040s2.L5, f1040s2.L6, f1040s2.L7a, f1040s2.L7b, f1040s2.L8,
  ));

  f1040.L12b = f1040s2.L3;
  f1040.L15 = f1040s2.L10;

  return { ...forms, f1040, f1040s2 };
};
