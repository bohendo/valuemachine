import { TaxRows, TaxInput } from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";

import { Forms, TaxYear, TaxYears } from "./mappings";
import { getUSA19Return, getUSA20Return } from "./usa";

const logger = getLogger("info", "TaxReturn");

export const getTaxReturn = (
  taxYear: TaxYear,
  taxInput: TaxInput,
  taxRows: TaxRows,
  log = logger,
): Forms =>
  !taxYear ? {}
  : taxYear === TaxYears.USA19 ? getUSA19Return(taxInput, taxRows, log)
  : taxYear === TaxYears.USA20 ? getUSA20Return(taxInput, taxRows, log)
  : {};
