import { FinancialData, Forms } from "../types";

export const f1040s1 = (finances: FinancialData, oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040, f1040s1 } = forms;

  return { ...forms, f1040s1 };
};
