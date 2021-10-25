import { TaxRow } from "@valuemachine/types";

import { Forms, getEmptyForms, TaxYear, TaxYears } from "./mappings";
import { getUSA19Return, getUSA20Return } from "./usa";

export const getTaxReturn = (
  year: TaxYear,
  taxRows: TaxRow[],
  formData: Forms,
): Forms =>
  !year ? {}
  : year === TaxYears.USA19 ? getUSA19Return(taxRows, formData)
  : year === TaxYears.USA20 ? getUSA20Return(taxRows, formData)
  : getEmptyForms(year);
