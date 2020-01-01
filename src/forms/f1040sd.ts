import * as mappings from '../mappings/f1040sd.json';
import { emptyForm, mergeForms } from '../utils';
import { InputData } from '../types';

export const f1040sd = (input: InputData, output: any): any[] => {
  const f1040sd = mergeForms(mergeForms(emptyForm(mappings), input.f1040sd), output.f1040sd);
  return [f1040sd]
}
