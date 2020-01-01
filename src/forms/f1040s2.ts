import * as mappings from '../mappings/f1040s2.json';
import { emptyForm, mergeForms } from '../utils';

export const f1040s2 = (input, output) => {
  const f1040s2 = mergeForms(mergeForms(emptyForm(mappings), input.f1040s2), output.f1040s2);
  return [f1040s2]
}
