import { TaxRow } from "@valuemachine/types";

import { Forms, getEmptyForms, TaxYears } from "../../mappings";

import { f1040 } from "./f1040";
import { f8949 } from "./f8949";

const year = TaxYears.USA20;

// TODO: keep side effects between form filers
export const getTaxReturn = (
  taxRows: TaxRow[],
  formData: Forms,
): Forms => {
  let forms = { ...getEmptyForms(year), ...formData };
  // We should run filers in reverse-filing order so f1040 should come last
  // `Na` should always come before `N` eg 12a before 12

  forms = f8949(taxRows, forms);
  forms = f1040(forms);

  return forms;
};

