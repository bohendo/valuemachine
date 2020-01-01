import * as mappings from '../mappings/f1040sd.json';
import { emptyForm, mergeForms } from '../utils';

export const f1040sd = (input, output) => {
  const f1040sd = mergeForms(mergeForms(emptyForm(mappings), input.f1040sd), output.f1040sd);
  return [f1040sd]
}
