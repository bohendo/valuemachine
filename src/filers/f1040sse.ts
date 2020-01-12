import { InputData, Forms } from '../types';
import { add, gt, lt, mul, round } from '../utils';

export const f1040sse = (input: InputData, oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const f1040s1 = forms.f1040s1 && forms.f1040s1[0] ? forms.f1040s1[0] : {};
  const f1040sse = forms.f1040sse && forms.f1040sse[0] ? forms.f1040sse[0] : {};

  f1040sse.f1_1 = `${input.FirstName} ${input.MiddleInitial} ${input.LastName}`;
  f1040sse.f1_2 = input.SocialSecurityNumber;
  f1040sse.f2_1 = f1040sse.f1_1;
  f1040sse.f2_2 = f1040sse.f1_2;

  f1040sse.f1_6 = round(add([f1040sse.f1_3, f1040sse.f1_4, f1040sse.f1_5]));
  f1040sse.f1_7 = round(mul(f1040sse.f1_6, "0.9235"));

  if (lt(f1040sse.f1_7, "400")) {
    return forms; // Don't need to file this form
  }

  f1040sse.f1_8 = round(
    gt(f1040sse.f1_7, "132900")
      ? add([mul(f1040sse.f1_7, "0.029"), "16479.60"])
      : mul(f1040sse.f1_7, "0.153")
  );
  f1040s1.Line4 = f1040sse.f1_8

  f1040sse.f1_9 = round(mul(f1040sse.f1_8, "0.5"));
  f1040s1.Line14 = f1040sse.f1_9;

  forms.f1040s1 = [f1040s1];
  forms.f1040sse = [f1040sse];
  return forms;
}
