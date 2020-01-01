import * as mappings from '../mappings/f1040sse.json';
import { emptyForm, mergeForms } from '../utils';
import { InputData } from '../types';

export type F1040sse = { [key in keyof typeof mappings]: string|boolean };

export const f1040sse = (input: InputData, output: any): F1040sse[] => {
  const f1040sse = mergeForms(mergeForms(emptyForm(mappings), input.f1040sse), output.f1040sse);
  return [f1040sse]
}
