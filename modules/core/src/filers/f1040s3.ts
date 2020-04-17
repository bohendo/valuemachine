import { Log } from "@finances/types";
import { Forms } from "../types";

export const f1040s3 = (vmLogs: Log[], oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040, f1040s3 } = forms;

  f1040s3.FullName = `${f1040.FirstNameMI} ${f1040.LastName}`;
  f1040s3.SSN = f1040.SocialSecurityNumber;

  return { ...forms, f1040s3 };
};
