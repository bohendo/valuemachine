import { InputData, Forms } from '../types';

export const f1040s1 = (input: InputData, oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const f1040s1 = forms.f1040s1 && forms.f1040s1[0] ? forms.f1040s1[0] : {};

  f1040s1.FullName = `${input.FirstName} ${input.MiddleInitial} ${input.LastName}`;
  f1040s1.SSN = input.SocialSecurityNumber;

  forms.f1040s1 = [f1040s1];
  return forms;
}

