import * as mappings from '../mappings/f1040.json';
import { emptyForm, mergeForms } from '../utils';
import { InputData } from '../types';

export type F1040 = { [key in keyof typeof mappings]: string|boolean };

export const f1040 = (input: InputData, output: any): any[] => {
  const f1040 = mergeForms(mergeForms(emptyForm(mappings), input.f1040), output.f1040) as any;
  f1040.mappings = mappings;
  return [f1040]
}