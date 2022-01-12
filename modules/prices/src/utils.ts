import {
  Assets,
} from "@valuemachine/transactions";
import {
  Asset,
  DateTimeString,
  Logger,
} from "@valuemachine/types";
import {
  ajv,
  formatErrors,
  msPerDay,
  toISOString,
  toTime,
} from "@valuemachine/utils";

import { PriceJson } from "./types";

const { ETH, MATIC, WETH, WMATIC } = Assets;

export const getEmptyPrices = (): PriceJson => ([]);

export const getNearbyPrices = (prices: PriceJson, time: number, asset, unit): PriceJson =>
  prices.filter(entry =>
    (entry.asset === asset && entry.unit === unit) ||
    (entry.unit === asset && entry.asset === unit)
  ).reduce((pair, point) => {
    if (pair.length === 1) return pair; // stop updating pair if we've found an exact match
    if (point.time === time) return [point];
    if (point.time < time && (!pair[0] || point.time > pair[0].time)) return [point, pair[1]];
    if (point.time > time && (!pair[1] || point.time < pair[1].time)) return [pair[0], point];
    return pair;
  }, [] as PriceJson);

// Get the equivalent ticker for wrapped/deposited assets
// eg WETH -> ETH, aDAI -> DAI, amMATIC -> MATIC, stkAAVE -> AAVE
// NOT used for wrapped/deposited assets with a different price than the underlying
export const toTicker = (asset: Asset) => {
  if (asset === WETH) return ETH;
  if (asset === WMATIC) return MATIC;
  if (asset.startsWith("stk")) return asset.substring(3);
  if (asset.startsWith("am")) return asset.substring(2);
  if (asset.startsWith("a")) return asset.substring(1);
  return asset;
};

export const daySuffix = "T00:00:00Z";

export const toNextDay = (d?: DateTimeString | number): DateTimeString =>
  toISOString(toTime(d) + msPerDay).split("T")[0] + daySuffix;

export const toDay = (d?: DateTimeString | number): DateTimeString =>
  toISOString(d).split("T")[0] + daySuffix;

const validatePrices = ajv.compile(PriceJson);
export const getPricesError = (pricesJson: PriceJson): string =>
  validatePrices(pricesJson)
    ? ""
    : validatePrices.errors.length ? formatErrors(validatePrices.errors)
    : `Invalid Prices`;

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
