import { InputData, Forms } from '../types';

export const f1040s1 = (input: InputData, oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  return forms;
}

