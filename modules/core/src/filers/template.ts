import { Forms, Log } from "../types";

export const f1040s1 = (vmLogs: Log[], oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040s1 } = forms;

  return { ...forms, f1040s1 };
};
