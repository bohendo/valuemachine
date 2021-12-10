import {
  Assets,
} from "@valuemachine/transactions";
import {
  Asset,
  DateString,
  DecString,
  DateTimeString,
  Logger,
} from "@valuemachine/types";
import {
  ajv,
  formatErrors,
  math,
} from "@valuemachine/utils";

import { PriceJson } from "./types";

const { ETH, MATIC, WETH, WMATIC } = Assets;

export const getEmptyPrices = (): PriceJson => ([]);

const validatePrices = ajv.compile(PriceJson);
export const getPricesError = (pricesJson: PriceJson): string =>
  validatePrices(pricesJson)
    ? ""
    : validatePrices.errors.length ? formatErrors(validatePrices.errors)
    : `Invalid Prices`;

// Limit value from having any more than 18 decimals of precision (but ensure it has at least 1)
export const formatPrice = (price: DecString): DecString => {
  const truncated = math.round(price, 18).replace(/0+$/, "");
  if (truncated.endsWith(".")) return truncated + "0";
  return truncated;
};

export const formatDate = (date: DateString | DateTimeString): DateString => {
  if (isNaN((new Date(date)).getTime())) {
    throw new Error(`Invalid Date: "${date}"`);
  } else if ((new Date(date)).getTime() > Date.now()) {
    throw new Error(`Date is in the future: "${date}"`);
  }
  return (new Date(date)).toISOString().split("T")[0];
};

// replace all wrapped assets with the underlying (unless they're fundamentally different eg WBTC)
export const formatUnit = (givenUnit: Asset): Asset => {
  const unit = givenUnit || ETH; // Default to using ETH as the unit of account
  return unit === WETH ? ETH : unit === WMATIC ? MATIC : unit;
};

export const retry = async (attempt: () => Promise<any>, log?: Logger): Promise<any> => {
  let response;
  try {
    response = await attempt();
  // Try one more time if we get a timeout
  } catch (e) {
    if (e.message.toLowerCase().includes("timeout") || e.message.includes("EAI_AGAIN")) {
      log?.warn(`Request timed out, trying one more time..`);
      await new Promise(res => setTimeout(res, 1000)); // short pause
      response = await attempt();
    } else if (e.message.includes("429") || e.message.toLowerCase().includes("rate limit")) {
      log?.warn(`We're rate limited, pausing then trying one more time..`);
      await new Promise(res => setTimeout(res, 8000)); // long pause
      response = await attempt();
    } else {
      throw e;
    }
  }
  return response;
};
