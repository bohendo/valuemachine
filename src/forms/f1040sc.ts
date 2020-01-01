import * as mappings from '../mappings/f1040sc.json';
import { emptyForm, mergeForms } from '../utils';
import { InputData } from '../types';

export const f1040sc = (input: InputData, output: any): any[] => {
  const f1040sc = mergeForms(mergeForms(emptyForm(mappings), input.f1040sc), output.f1040sc);
  return [f1040sc]
}
