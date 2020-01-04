import * as mappings from '../mappings/f1040s1.json';
import { emptyForm, mergeForms } from '../utils';
import { HasMappings, InputData } from '../types';

export type F1040s1 = HasMappings & { [key in keyof typeof mappings]: string|boolean; };

export const f1040s1 = (input: InputData, output: any): F1040s1[] => {
  const f1040s1 = mergeForms(mergeForms(emptyForm(mappings), input.f1040s1), output.f1040s1) as any;
  f1040s1.mappings = mappings;
  if (process.env.MODE === "test") { return [f1040s1]; }

  f1040s1.FullName = `${input.FirstName} ${input.MiddleInitial} ${input.LastName}`;
  f1040s1.SSN = input.SocialSecurityNumber;

  return [f1040s1]
}

