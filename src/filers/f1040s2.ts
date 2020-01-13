import { InputData, Forms } from '../types';
import { add, round } from '../utils';

export const f1040s2 = (input: InputData, oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const f1040s2 = forms.f1040s2 && forms.f1040s2[0] ? forms.f1040s2[0] : {};

  f1040s2.FullName = `${input.FirstName} ${input.MiddleInitial} ${input.LastName}`;
  f1040s2.SSN = input.SocialSecurityNumber;

  f1040s2.L3 = round(add([f1040s2.L1, f1040s2.L2]));
  f1040s2.L10 = round(add([
    f1040s2.L4, f1040s2.L5, f1040s2.L6, f1040s2.L7a, f1040s2.L7b, f1040s2.L8,
  ]));

  forms.f1040s2 = [f1040s2];
  return forms;
}

