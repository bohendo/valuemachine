import * as mappings from '../mappings/f1040sc.json';
import { emptyForm, mergeForms } from '../utils';
import { HasMappings, InputData } from '../types';

export type F1040sc = HasMappings & { [key in keyof typeof mappings]: string|boolean; };

export const f1040sc = (input: InputData, output: any): F1040sc[] => {
  const f1040sc = mergeForms(mergeForms(emptyForm(mappings), input.f1040sc), output.f1040sc) as any;
  f1040sc.mappings = mappings;
  if (process.env.MODE === "test") { return [f1040sc]; }

  // f1040sc.FullName = `${input.FirstName} ${input.MiddleInitial} ${input.LastName}`;
  // f1040sc.SSN = input.SocialSecurityNumber;

  return [f1040sc]
}

