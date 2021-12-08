import Ajv from "ajv";
import addFormats from "ajv-formats";

import { PriceJson } from "./types";

export const getEmptyPrices = (): PriceJson => ({});

const ajv = addFormats(new Ajv()).addKeyword("kind").addKeyword("modifier");

const formatErrors = errors => errors.map(error =>
  `${error.instancePath ? error.instancePath.replace(/^[/]/, "") + ": " : ""}${error.message}`
).slice(0, 2).join(", ");

const validatePrices = ajv.compile(PriceJson);
export const getPricesError = (pricesJson: PriceJson): string =>
  validatePrices(pricesJson)
    ? ""
    : validatePrices.errors.length ? formatErrors(validatePrices.errors)
    : `Invalid Prices`;

