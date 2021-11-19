import { TaxRows, TaxInput, TaxYear } from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";

import { Forms, TaxYears } from "./mappings";
import { getUSA2019Return, getUSA2020Return } from "./USA";

const logger = getLogger("info", "TaxReturn");

export const getTaxReturn = (
  taxYear: TaxYear,
  taxInput: TaxInput,
  taxRows: TaxRows,
  log = logger,
): Forms =>
  !taxYear ? {}
  : taxYear === TaxYears.USA2019 ? getUSA2019Return(taxInput, taxRows, log)
  : taxYear === TaxYears.USA2020 ? getUSA2020Return(taxInput, taxRows, log)
  : {};
