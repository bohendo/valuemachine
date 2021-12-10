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
  toDay,
  toTicker,
  retry,
} from "../utils";

// curl https://api.coingecko.com/api/v3/coins/list
// | jq 'map({ key: .symbol, value: .id }) | from_entries' > ./coingecko.json
import * as coingecko from "./coingecko-index.json";

export const fetchCoinGeckoPrice = async (
  givenDate: DateTimeString,
  givenAsset: Asset,
  givenUnit: Asset,
  log?: Logger,
): Promise<string | undefined> => {
  const [asset, unit] = [toTicker(givenAsset), toTicker(givenUnit)];
  const day = toDay(givenDate);
  const coinId = coingecko[asset] || coingecko[asset.toLowerCase()];
  if (!coinId) {
    log?.warn(`Asset "${asset}" is not available on CoinGecko`);
    return undefined;
  }
  // eg https://api.coingecko.com/api/v3/coins/bitcoin/history?date=30-12-2017
  const coingeckoUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${
    `${day.split("-")[2]}-${day.split("-")[1]}-${day.split("-")[0]}`
  }`;
  log?.info(`Fetching ${unit} price of ${asset} on ${day} from ${coingeckoUrl}`);
  const attempt = async () => (await axios.get(coingeckoUrl, { timeout: 10000 })).data;
  let price;
  try {
    const response = await retry(attempt, log);
    price = response?.market_data?.current_price?.[unit.toLowerCase()]?.toString();
  } catch (e) {
    log?.error(e.message);
  }
  if (!price || math.eq(price, "0")) {
    log?.warn(`Could not fetch ${asset} price from CoinGecko on ${day}`);
  }
  return price;
};
