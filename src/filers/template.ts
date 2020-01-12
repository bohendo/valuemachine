import { InputData, Forms } from '../types';

export const f1234 = (input: InputData, oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const f1234 = forms.f1234 && forms.f1234[0] ? forms.f1234[0] : {};

  f1234.FullName = `${input.FirstName} ${input.MiddleInitial} ${input.LastName}`;
  f1234.SSN = input.SocialSecurityNumber;

  forms.f1234 = [f1234];
  return forms;
}

