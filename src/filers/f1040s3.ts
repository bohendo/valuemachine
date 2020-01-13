import { InputData, Forms } from '../types';

export const f1040s3 = (input: InputData, oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const f1040s3 = forms.f1040s3 && forms.f1040s3[0] ? forms.f1040s3[0] : {};

  f1040s3.FullName = `${input.FirstName} ${input.MiddleInitial} ${input.LastName}`;
  f1040s3.SSN = input.SocialSecurityNumber;

  forms.f1040s3 = [f1040s3];
  return forms;
}

