import { TaxRow, TaxInput } from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";

import { Forms, TaxYear, TaxYears } from "./mappings";
import { getUSA19Return, getUSA20Return } from "./usa";

const logger = getLogger("info", "TaxReturn");

export const getTaxReturn = (
  year: TaxYear,
  taxInput: TaxInput,
  taxRows: TaxRow[],
  log = logger,
): Forms =>
  !year ? {}
  : year === TaxYears.USA19 ? getUSA19Return(taxInput, taxRows, log)
  : year === TaxYears.USA20 ? getUSA20Return(taxInput, taxRows, log)
  : {};
