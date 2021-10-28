import { TaxRow } from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";

import { Forms, getEmptyForms, TaxYear, TaxYears } from "./mappings";
import { getUSA19Return, getUSA20Return } from "./usa";

const logger = getLogger("info", "TaxReturn");

export const getTaxReturn = (
  year: TaxYear,
  formData: Forms,
  taxRows: TaxRow[],
  log = logger,
): Forms =>
  !year ? {}
  : year === TaxYears.USA19 ? getUSA19Return(formData, taxRows, log)
  : year === TaxYears.USA20 ? getUSA20Return(formData, taxRows, log)
  : getEmptyForms(year);
