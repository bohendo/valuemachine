import * as mappings from '../mappings/f1040s3.json';
import { emptyForm, mergeForms } from '../utils';
import { InputData } from '../types';

export type F1040s3 = { [key in keyof typeof mappings]: string|boolean };

export const f1040s3 = (input: InputData, output: any): F1040s3[] => {
  const f1040s3 = mergeForms(mergeForms(emptyForm(mappings), input.f1040s3), output.f1040s3);
  return [f1040s3]
}
