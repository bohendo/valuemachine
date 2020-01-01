import * as mappings from '../mappings/f1040.json';
import { emptyForm, mergeForms } from '../utils';

export const f1040 = (input, output) => {
  const f1040 = mergeForms(mergeForms(emptyForm(mappings), input.f1040), output.f1040);
  return [f1040]
}
