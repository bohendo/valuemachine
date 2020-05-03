import { Log } from "@finances/types";
import { math } from "@finances/utils";

import { Forms } from "../types";

const { add, gt, sub } = math;

export const f1040 = (vmLogs: Log[], oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040, f1040s2, f1040s3 } = forms;

  f1040.L7b = add(
    f1040.L1, f1040.L2b, f1040.L3b, f1040.L4b,
    f1040.L4d, f1040.L5b, f1040.L6, f1040.L7a,
  );

  f1040.L7b = add(
    f1040.L1, f1040.L2b, f1040.L3b, f1040.L4b,
    f1040.L4d, f1040.L5b, f1040.L6, f1040.L7a,
  );

  f1040.L8b = sub(f1040.L7b, f1040.L8a);

  if (f1040.Single || f1040.MarriedFilingSeparately) {
    f1040.L9 = "12200";
  } else if (f1040.MarriedFilingJointly || f1040.QualifiedWidow) {
    f1040.L9 = "24400";
  } else if (f1040.HeadOfHousehold) {
    f1040.L9 = "18350";
  }

  f1040.L11a = add(f1040.L9, f1040.L10);

  const taxableIncome = sub(f1040.L8b, f1040.L11a);
  f1040.L11b = gt(taxableIncome, "0") ? taxableIncome : "0";

  f1040.L12b = add(f1040s2.L3, f1040.L12a);

  f1040.L13b = add(f1040s3.L7, f1040.L13a);

  const taxesSoFar = sub(f1040.L12b, f1040.L13b);
  f1040.L14 = gt(taxesSoFar, "0") ? taxesSoFar : "0";

  f1040.L16 = add(f1040.L14, f1040.L15);

  f1040.L18e = add(f1040.L18a, f1040.L18b, f1040.L18c, f1040.L18d);

  f1040.L19 = add(f1040.L17, f1040.L18e);

  const overpaid = sub(f1040.L19, f1040.L16);
  f1040.L20 = gt(overpaid, "0") ? overpaid : "0";

  const owed = sub(f1040.L16, f1040.L19);
  f1040.L23 = gt(owed, "0") ? owed : "0";

  return { ...forms, f1040, f1040s2, f1040s3 };
};
