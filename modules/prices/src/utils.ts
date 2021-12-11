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
  msPerDay,
  toISOString,
  toTime,
} from "@valuemachine/utils";

import { PriceJson } from "./types";

const { ETH, MATIC, WETH, WMATIC } = Assets;

export const getEmptyPrices = (): PriceJson => ([]);

export const getNearbyPrices = (prices: PriceJson, date, asset, unit): PriceJson =>
  prices.filter(entry =>
    (entry.asset === asset && entry.unit === unit) ||
    (entry.unit === asset && entry.asset === unit)
  ).reduce((pair, point) => {
    if (pair.length === 1) return pair; // stop updating pair if we've found an exact match
    if (point.date === date) return [point];
    if (point.date < date && (!pair[0] || point.date > pair[0].date)) return [point, pair[1]];
    if (point.date > date && (!pair[1] || point.date < pair[1].date)) return [pair[0], point];
    return pair;
  }, [] as PriceJson);

// Get the equivalent ticker for wrapped/deposited assets
// eg WETH -> ETH, aDAI -> DAI, amMATIC -> MATIC, stkAAVE -> AAVE
// NOT used for wrapped/deposited assets with a different price than the underlying
export const toTicker = (asset: Asset) => {
  if (asset === WETH) return ETH;
  if (asset === WMATIC) return MATIC;
  if (asset.startsWith("a")) return asset.substring(1);
  if (asset.startsWith("am")) return asset.substring(2);
  if (asset.startsWith("stk")) return asset.substring(3);
  return asset;
};

export const daySuffix = "T00:00:00Z";

export const toNextDay = (d?: DateTimeString): DateTimeString =>
  toISOString(toTime(d) + msPerDay).split("T")[0] + daySuffix;

export const toDay = (d?: DateTimeString): DateTimeString =>
  toISOString(d).split("T")[0] + daySuffix;

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
