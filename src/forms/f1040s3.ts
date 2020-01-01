import * as mappings from '../mappings/f1040s3.json';
import { emptyForm, mergeForms } from '../utils';

export const f1040s3 = (input, output) => {
  const f1040s3 = mergeForms(mergeForms(emptyForm(mappings), input.f1040s3), output.f1040s3);
  return [f1040s3]
}
