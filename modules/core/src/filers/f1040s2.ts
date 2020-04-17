import { Log } from "@finances/types";
import { Forms } from "../types";
import { add, round } from "../utils";

export const f1040s2 = (vmLogs: Log[], oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040, f1040s2 } = forms;

  f1040s2.FullName = `${f1040.FirstNameMI} ${f1040.LastName}`;
  f1040s2.SSN = f1040.SocialSecurityNumber;

  f1040s2.L3 = round(add([f1040s2.L1, f1040s2.L2]));
  f1040s2.L10 = round(add([
    f1040s2.L4, f1040s2.L5, f1040s2.L6, f1040s2.L7a, f1040s2.L7b, f1040s2.L8,
  ]));

  return { ...forms, f1040s2 };
};
