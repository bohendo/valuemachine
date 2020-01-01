import * as mappings from '../mappings/f1040sc.json';
import { emptyForm, mergeForms } from '../utils';
import { InputData } from '../types';

export type F1040sc = { [key in keyof typeof mappings]: string|boolean };

export const f1040sc = (input: InputData, output: any): F1040sc[] => {
  const f1040sc = mergeForms(mergeForms(emptyForm(mappings), input.f1040sc), output.f1040sc);
  return [f1040sc]
}
