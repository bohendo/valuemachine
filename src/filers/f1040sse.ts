import { InputData, Forms } from '../types';

export const f1040sse = (input: InputData, oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const f1040sse = forms.f1040sse && forms.f1040sse[0] ? forms.f1040sse[0] : {};

  f1040sse["f1_1"] = `${input.FirstName} ${input.MiddleInitial} ${input.LastName}`;
  f1040sse["f1_2"] = input.SocialSecurityNumber;
  f1040sse["f2_1"] = f1040sse["f1_1"];
  f1040sse["f2_2"] = f1040sse["f1_2"];

  forms.f1040sse = [f1040sse];
  return forms;
}
