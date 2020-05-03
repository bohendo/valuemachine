import { Log } from "@finances/types";

import { Forms } from "../types";

export const f2210 = (vmLogs: Log[], oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040, f1040s2, f2210 } = forms;

  f2210.FullName = `${f1040.FirstNameMI} ${f1040.LastName}`;
  f2210.SSN = f1040.SocialSecurityNumber;

  f2210.L1 = f1040.L14;
  f2210.L2 = f1040s2.L4;

  return { ...forms, f2210 };
};
