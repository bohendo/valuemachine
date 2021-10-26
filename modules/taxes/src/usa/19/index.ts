import { TaxRow } from "@valuemachine/types";

import { Forms, getEmptyForms, TaxYears } from "../../mappings";

import { f1040 } from "./f1040";
import { f1040s1 } from "./f1040s1";
import { f1040s2 } from "./f1040s2";
import { f1040s3 } from "./f1040s3";
import { f1040sc } from "./f1040sc";
import { f1040sd } from "./f1040sd";
import { f1040sse } from "./f1040sse";
import { f2210 } from "./f2210";
import { f2555 } from "./f2555";
import { f8889 } from "./f8889";
import { f8949 } from "./f8949";

const year = TaxYears.USA19;

export const getTaxReturn = (
  taxRows: TaxRow[],
  formData: Forms,
): Forms => {
  let forms = { ...getEmptyForms(year), ...formData };
  // We should run filers in reverse-sequence-number order so f1040 should come last
  // `Na` should always come before `N` eg 12a before 12

  /*seq no 52*/ forms = f8889(taxRows, forms);
  /*seq no 34*/ forms = f2555(taxRows, forms);
  /*seq no 17*/ forms = f1040sse(taxRows, forms);
  /*seq no 12a*/ forms = f8949(taxRows, forms);
  /*seq no 12*/ forms = f1040sd(taxRows, forms);
  /*seq no 9*/ forms = f1040sc(taxRows, forms);
  /*seq no 6*/ forms = f2210(taxRows, forms);
  /*seq no 3*/ forms = f1040s3(taxRows, forms);
  /*seq no 2*/ forms = f1040s2(taxRows, forms);
  /*seq no 1*/ forms = f1040s1(taxRows, forms);
  /*seq no 0*/ forms = f1040(forms);

  return forms;
};
