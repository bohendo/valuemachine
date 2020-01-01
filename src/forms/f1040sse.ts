import * as mappings from '../mappings/f1040sse.json';
import { emptyForm, mergeForms } from '../utils';

export const f1040sse = (input, output) => {
  const f1040sse = mergeForms(mergeForms(emptyForm(mappings), input.f1040sse), output.f1040sse);
  return [f1040sse]
}
