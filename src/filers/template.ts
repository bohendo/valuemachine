import { FinancialData, Forms } from '../types';

export const f1040s1 = (finances: FinancialData, oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const f1040s1 = forms.f1040s1 && forms.f1040s1[0] ? forms.f1040s1[0] : {};

  // f1040s1.FullName = `${forms.f1040.FirstName} ${forms.f1040.MiddleInitial} ${forms.f1040.LastName}`;
  // f1040s1.SSN = forms.f1040.SocialSecurityNumber;

  forms.f1040s1 = [f1040s1];
  return forms;
}

