import { Forms, Log } from "../types";
import { add, gt, lt, mul, round } from "../utils";

export const f1040sse = (vmLogs: Log[], oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040, f1040s1, f1040s2, f1040sse } = forms;

  f1040sse.FullName_1 = `${forms.f1040.FirstNameMI} ${forms.f1040.LastName}`;
  f1040sse.SSN_1 = forms.f1040.SocialSecurityNumber;
  f1040sse.FullName_2 = f1040sse.FullName_1;
  f1040sse.SSN_2 = f1040sse.SSN_1;

  f1040sse.L3 = round(add([f1040sse.L1a, f1040sse.L1b, f1040sse.L2]));
  f1040sse.L4 = round(mul(f1040sse.L3, "0.9235"));

  if (lt(f1040sse.L4, "400")) {
    return forms; // Don't need to file this form
  }

  f1040sse.L5 = round(
    gt(f1040sse.L4, "132900")
      ? add([mul(f1040sse.L4, "0.029"), "16479.60"])
      : mul(f1040sse.L4, "0.153"),
  );
  f1040s2.L4 = f1040sse.L5;

  f1040sse.L6 = round(mul(f1040sse.L5, "0.5"));
  f1040s1.L14 = f1040sse.L6;

  return { ...forms, f1040, f1040s1, f1040s2, f1040sse };
};
