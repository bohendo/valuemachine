import { TaxRow } from "@valuemachine/types";

import { Forms, getEmptyForms, TaxYears } from "../../mappings";

import { f1040 } from "./f1040";
import { f1040s1 } from "./f1040s1";
import { f1040s2 } from "./f1040s2";
import { f1040s3 } from "./f1040s3";
import { f2210 } from "./f2210";
import { f1040sc } from "./f1040sc";
import { f1040sd } from "./f1040sd";
import { f8949 } from "./f8949";
import { f1040sse } from "./f1040sse";
import { f2555 } from "./f2555";

const year = TaxYears.USA20;

export const getTaxReturn = (
  taxRows: TaxRow[],
  formData: Forms,
): Forms => {
  let forms = { ...getEmptyForms(year), ...formData };
  // We should run filers in reverse-filing order so f1040 should come last
  // Look for "Sequence Attachment No" in the top right corner of each form
  // `Na` should always come before `N` eg 12a before 12

  /*seq no 34*/ forms = f2555(forms, taxRows);
  /*seq no 12a*/forms = f8949(forms, taxRows);
  /*seq no 12*/ forms = f1040sd(forms, taxRows);
  /*seq no 9*/  forms = f1040sc(forms, taxRows);
  /*seq no 17*/ forms = f1040sse(forms, taxRows); // NOTE: sse depends on sc despite the seq nos..
  /*seq no 6*/  forms = f2210(forms, taxRows);
  /*seq no 3*/  forms = f1040s3(forms, taxRows);
  /*seq no 2*/  forms = f1040s2(forms, taxRows);
  /*seq no 1*/  forms = f1040s1(forms, taxRows);
  /*seq no 0*/  forms = f1040(forms);

  return forms;
};

