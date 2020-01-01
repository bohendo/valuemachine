import * as mappings from '../mappings/f1040.json';
import { emptyForm, mergeForms } from '../utils';
import { InputData } from '../types';

export const f1040 = (input: InputData, output: any): any[] => {
  const f1040 = mergeForms(mergeForms(emptyForm(mappings), input.f1040), output.f1040);
  return [f1040]
}
