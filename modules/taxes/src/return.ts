import { TaxRow } from "@valuemachine/types";

import { Forms, getEmptyForms, TaxYear, TaxYears } from "./mappings";
import { getUSA19Return, getUSA20Return } from "./usa";

export const getTaxReturn = (
  year: TaxYear,
  formData: Forms,
  taxRows: TaxRow[],
): Forms =>
  !year ? {}
  : year === TaxYears.USA19 ? getUSA19Return(formData, taxRows)
  : year === TaxYears.USA20 ? getUSA20Return(formData, taxRows)
  : getEmptyForms(year);
