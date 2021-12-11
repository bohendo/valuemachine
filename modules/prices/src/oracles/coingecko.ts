import {
  Asset,
  Logger,
  DateTimeString,
} from "@valuemachine/types";
import {
  math,
} from "@valuemachine/utils";
import axios from "axios";

import {
  PriceJson,
  PriceEntry,
  PriceSources,
} from "../types";
import {
  retry,
  toDay,
  toNextDay,
  toTicker,
} from "../utils";

// curl https://api.coingecko.com/api/v3/coins/list
// | jq 'map({ key: .symbol, value: .id }) | from_entries' > ./coingecko.json
import * as coingecko from "./coingecko-index.json";

const source = PriceSources.CoinGecko;

// Usually, the asset or unit that sorts first is treated as the unit
const getNearbyPrices = (prices: PriceJson, date, asset, unit): PriceJson =>
  prices.filter(entry =>
    (entry.asset === asset && entry.unit === unit) ||
    (entry.unit === asset && entry.asset === unit)
  ).reduce((pair, point) => {
    if (pair.length === 1) return pair; // stop updating pair if we've found an exact match
    if (point.date === date) return [point];
    if (point.date < date && (!pair[0] || point.date > pair[0].date)) return [point, pair[1]];
    if (point.date > date && (!pair[1] || point.date > pair[1].date)) return [pair[0], point];
    return pair;
  }, [] as PriceJson);

const fetchCoinGeckoPrice = async (
  givenDate: DateTimeString,
  givenAsset: Asset,
  givenUnit: Asset,
  log?: Logger,
): Promise<string | undefined> => {
  const [asset, unit] = [toTicker(givenAsset), toTicker(givenUnit)];
  const day = toDay(givenDate).split("T")[0];
  const coinId = coingecko[asset] || coingecko[asset.toLowerCase()];
  if (!coinId) {
    log?.warn(`Asset "${asset}" is not available on ${source}`);
    return undefined;
  }
  // eg https://api.coingecko.com/api/v3/coins/bitcoin/history?date=30-12-2017
  const coingeckoUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${
    `${day.split("-")[2]}-${day.split("-")[1]}-${day.split("-")[0]}`
  }`;
  log?.info(`Fetching ${unit} price of ${asset} on ${day} from ${coingeckoUrl}`);
  const attempt = async () => (await axios.get(coingeckoUrl, { timeout: 8000 })).data;
  let price;
  try {
    const response = await retry(attempt, log);
    price = response?.market_data?.current_price?.[unit.toLowerCase()]?.toString();
  } catch (e) {
    log?.error(e.message);
  }
  if (!price || math.eq(price, "0")) {
    log?.warn(`Could not fetch ${asset} price from ${source} on ${day}`);
  }
  return price;
};

export const getCoinGeckoEntries = async (
  prices: PriceJson,
  date: DateTimeString,
  asset: Asset,
  unit: Asset,
  setPrice: (entry: PriceEntry) => void,
  log?: Logger,
): Promise<PriceJson> => {
  // TODO: move this day before & after logic into the coingecko fetcher
  // Then we should just give the fetcher the target date & it will return the 1 or 2
  // entries we need (and it shouldn't re-fetch them if we have them already)
  // This might mean that we need to give the list of price entries to the coingecko fetcher..
  let day = toDay(date);
  const nearby = getNearbyPrices(
    prices.filter(entry => entry.source === source),
    date,
    asset,
    unit,
  );
  log?.debug(nearby, `Found ${nearby.filter(p => !!p).length} nearby prices`);
  if (nearby.length === 1) { // we found an exact match
    log?.debug(`We already have an exact price for ${date}, returning it`);
    return nearby;
  } else if (nearby.length === 0 || nearby.length === 2) {
    if (day === date) {
      const price = await fetchCoinGeckoPrice(day, asset, unit, log);
      if (price) {
        const newEntry = { date: day, unit, asset, price, source };
        setPrice(newEntry);
        nearby[0] = newEntry;
      }
    } else {
      if (!nearby[0]?.date || nearby[0].date < day) {
        const price = await fetchCoinGeckoPrice(day, asset, unit, log);
        if (price) {
          const newEntry = { date: day, unit, asset, price, source };
          setPrice(newEntry);
          nearby[0] = newEntry;
        }
      }
      day = toNextDay(date);
      if (!nearby[1]?.date || nearby[1].date > day) {
        const price = await fetchCoinGeckoPrice(day, asset, unit, log);
        if (price) {
          const newEntry = { date: day, unit, asset, price, source };
          setPrice(newEntry);
          nearby[1] = newEntry;
        }
      }
    }
  } else {
    log.warn(`IDK how to fetch data for ${nearby.length} nearby prices`);
  }
  return nearby;
};
