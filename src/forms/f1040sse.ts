import * as mappings from '../mappings/f1040sse.json';
import { emptyForm, mergeForms } from '../utils';
import { InputData } from '../types';

export const f1040sse = (input: InputData, output: any): any => {
  const f1040sse = mergeForms(mergeForms(emptyForm(mappings), input.f1040sse), output.f1040sse);
  return [f1040sse]
}
