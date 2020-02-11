import { FinancialData, Forms } from "../types";
import { add, gt, lt, eq, round, sub } from "../utils";

export const f1040 = (finances: FinancialData, oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040, f1040s2, f1040s3 } = forms;

  f1040.L7b = round(add([
    f1040.L1, f1040.L2b, f1040.L3b, f1040.L4b,
    f1040.L4d, f1040.L5b, f1040.L6, f1040.L7a,
  ]));

  f1040.L7b = round(add([
    f1040.L1, f1040.L2b, f1040.L3b, f1040.L4b,
    f1040.L4d, f1040.L5b, f1040.L6, f1040.L7a,
  ]));

  f1040.L8b = round(sub(f1040.L7b, f1040.L8a));

  f1040.L11a = round(add([f1040.L9, f1040.L10]));

  const taxableIncome = add([f1040.L8b, f1040.L11a]);
  f1040.L11b = round(gt(taxableIncome, "0") ? taxableIncome : "0");

  f1040.L12b = round(add([f1040s2.L3, f1040.L12a]));

  f1040.L13b = round(add([f1040s3.L7, f1040.L13a]));

  const taxesSoFar = sub(f1040.L12b, f1040.L13b);
  f1040.L14 = round(gt(taxesSoFar, "0") ? taxesSoFar : "0");

  f1040.L16 = round(add([f1040.L14, f1040.L15]));

  f1040.L18e = round(add([f1040.L18a, f1040.L18b, f1040.L18c, f1040.L18d]));

  f1040.L19 = round(add([f1040.L17, f1040.L18e]));

  const overpaid = sub(f1040.L19, f1040.L16);
  f1040.L20 = round(gt(overpaid, "0") ? overpaid : "0");

  const owed = sub(f1040.L16, f1040.L19);
  f1040.L23 = round(gt(owed, "0") ? owed : "0");

  return { ...forms, f1040, f1040s2, f1040s3 };
};
