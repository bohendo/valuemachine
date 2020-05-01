import { Log } from "@finances/types";

import { Forms } from "../types";

export const f2210 = (vmLogs: Log[], oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f2210 } = forms;

  f2210.FullName = `${forms.f1040.FirstNameMI} ${forms.f1040.LastName}`;
  f2210.SSN = forms.f1040.SocialSecurityNumber;

  return { ...forms, f2210 };
};
