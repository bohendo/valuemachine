import { Event } from "@valuemachine/types";
import { math } from "@valuemachine/utils";

import { Forms } from "../types";

const { add, round } = math;

export const f1040s2 = (vmEvents: Event[], oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040, f1040s2 } = forms;

  f1040s2.FullName = `${f1040.FirstNameMI} ${f1040.LastName}`;
  f1040s2.SSN = f1040.SocialSecurityNumber;

  f1040s2.L3 = round(add(f1040s2.L1, f1040s2.L2));
  f1040s2.L10 = round(add(
    f1040s2.L4, f1040s2.L5, f1040s2.L6, f1040s2.L7a, f1040s2.L7b, f1040s2.L8,
  ));

  f1040.L12b = f1040s2.L3;
  f1040.L15 = f1040s2.L10;

  return { ...forms, f1040, f1040s2 };
};
