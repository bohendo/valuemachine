import { TaxInput, TaxRows } from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";

import { getEmptyForms, TaxYears } from "../../mappings";

import { f1040 } from "./f1040";
import { f1040s1 } from "./f1040s1";
import { f1040s2 } from "./f1040s2";
import { f1040s3 } from "./f1040s3";
import { f2210 } from "./f2210";
import { f1040sa } from "./f1040sa";
import { f1040sb } from "./f1040sb";
import { f1040sc } from "./f1040sc";
import { f1040sd } from "./f1040sd";
import { f8949 } from "./f8949";
import { f1040sse } from "./f1040sse";
import { f2555 } from "./f2555";
import { Forms } from "./utils";

const taxYear = TaxYears.USA20;
const logger = getLogger("info", taxYear);

export const getTaxReturn = (
  taxInput: TaxInput,
  taxRows: TaxRows,
  log = logger,
): Forms => {
  const input = JSON.parse(JSON.stringify(taxInput)) as TaxInput;
  let forms = { ...getEmptyForms(taxYear), ...input.forms as Forms };

  // We should run filers in reverse-filing order so f1040 should come last
  // Look for "Sequence Attachment No" in the top right corner of each form
  // `Na` should always come before `N` eg 12a before 12

  /*seq no 12a*/forms = f8949(forms, input, taxRows, log);
  /*seq no 12*/ forms = f1040sd(forms, input, taxRows, log);
  // NOTE: 2555 depends on sd despite the higher seq no..
  /*seq no 34*/ forms = f2555(forms, input, taxRows, log);
  /*seq no 9*/  forms = f1040sc(forms, input, taxRows, log);
  // NOTE: sse depends on sc despite the higher seq no..
  /*seq no 17*/ forms = f1040sse(forms, input, taxRows, log);
  /*seq no 8*/  forms = f1040sb(forms, input, taxRows, log);
  /*seq no 7*/  forms = f1040sa(forms, input, taxRows, log);
  /*seq no 3*/  forms = f1040s3(forms, input, taxRows, log);
  /*seq no 2*/  forms = f1040s2(forms, input, taxRows, log);
  /*seq no 1*/  forms = f1040s1(forms, input, taxRows, log);
  /*seq no 0*/  forms = f1040(forms, input, taxRows, log);
  // NOTE: f2210 depends on f1040 despite the higher seq no..
  /*seq no 6*/  forms = f2210(forms, input, taxRows, log);

  return forms;
};

