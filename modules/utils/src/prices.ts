import { PricesJson } from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

export const getEmptyPrices = (): PricesJson => ({});

const validatePrices = ajv.compile(PricesJson);
export const getPricesError = (pricesJson: PricesJson): string | null =>
  validatePrices(pricesJson)
    ? null
    : validatePrices.errors.length ? formatErrors(validatePrices.errors)
    : `Invalid Prices`;
