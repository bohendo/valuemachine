import { InputData, Forms } from '../types';
import { add, round } from '../utils';

export const f1040s1 = (input: InputData, oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const f1040 = forms.f1040 && forms.f1040[0] ? forms.f1040[0] : {};
  const f1040s1 = forms.f1040s1 && forms.f1040s1[0] ? forms.f1040s1[0] : {};

  f1040s1.FullName = `${input.FirstName} ${input.MiddleInitial} ${input.LastName}`;
  f1040s1.SSN = input.SocialSecurityNumber;

  f1040s1.Line9 = round(add([
    f1040s1.Line1, f1040s1.Line2a, f1040s1.Line3, f1040s1.Line4,
    f1040s1.Line5, f1040s1.Line6, f1040s1.Line7, f1040s1.Line8,
  ]));
  f1040.Line7a = f1040s1.Line9

  f1040s1.Line22 = round(add([
    f1040s1.Line10, f1040s1.Line11, f1040s1.Line12, f1040s1.Line13,
    f1040s1.Line14, f1040s1.Line15, f1040s1.Line16, f1040s1.Line17,
    f1040s1.Line18a, f1040s1.Line19, f1040s1.Line20, f1040s1.Line21,
  ]));
  f1040.Line8a = f1040s1.Line22

  forms.f1040 = [f1040];
  forms.f1040s1 = [f1040s1];
  return forms;
}
