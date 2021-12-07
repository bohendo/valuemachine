import Ajv from "ajv";
import addFormats from "ajv-formats";

import { PricesJson } from "./types";

export const getEmptyPrices = (): PricesJson => ({});

const ajv = addFormats(new Ajv()).addKeyword("kind").addKeyword("modifier");

const formatErrors = errors => errors.map(error =>
  `${error.instancePath ? error.instancePath.replace(/^[/]/, "") + ": " : ""}${error.message}`
).slice(0, 2).join(", ");

const validatePrices = ajv.compile(PricesJson);
export const getPricesError = (pricesJson: PricesJson): string =>
  validatePrices(pricesJson)
    ? ""
    : validatePrices.errors.length ? formatErrors(validatePrices.errors)
    : `Invalid Prices`;

