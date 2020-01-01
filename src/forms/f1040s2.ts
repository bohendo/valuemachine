import * as mappings from '../mappings/f1040s2.json';
import { emptyForm, mergeForms, translate } from '../utils';
import { InputData } from '../types';

export type F1040s2 = { [key in keyof typeof mappings]: string|boolean };

export const f1040s2 = (input: InputData, output: any): any[] => {
  const f1040s2 = mergeForms(mergeForms(emptyForm(mappings), input.f1040s2), output.f1040s2);
  return [f1040s2].map(translate(mappings))
}
