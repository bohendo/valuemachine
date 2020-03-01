import fs from "fs";
import axios from "axios";
// import { formatEther } from "ethers/utils";

import { DateString, PriceData, TimestampString } from "./types";
import { Logger } from "./utils";
import { env } from "./env";

const emptyPriceData: PriceData = {
  ids: {},
};

const cacheFile = "./price-data.json";

const loadCache = (log: Logger): PriceData => {
  try {
    return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  } catch (e) {
    if (e.message.startsWith("ENOENT: no such file or directory")) {
      return emptyPriceData;
    }
    log.warn(e.message);
    throw new Error(`Unable to load priceData cache, try deleting ${cacheFile} & try again`);
  }
};

const saveCache = (priceData: PriceData): void =>
  fs.writeFileSync(cacheFile, JSON.stringify(priceData, null, 2));

export const fetchPrice = async (
  asset: string,
  timestamp: TimestampString,
): Promise<string> => {
  const log = new Logger("FetchPriceData", env.logLevel);
  const prices = loadCache(log) as PriceData;
  const date = (timestamp.includes("T") ? timestamp.split("T")[0] : timestamp) as DateString;
  const coingeckoUrl = "https://api.coingecko.com/api/v3";

  if (!prices[date]) {
    prices[date] = {};
  }

  if (!prices[date][asset]) {

    // get coin id
    if (!prices.ids[asset]) {
      log.info(`Fetching coin id for ${asset}..`);
      const coins = (await axios(`${coingeckoUrl}/coins/list`)).data;
      const coin = coins.find(coin => coin.symbol.toLowerCase() === asset.toLowerCase());
      if (!coin || !coin.id) {
        throw new Error(`Asset ${asset} is not supported by coingecko`);
      }
      prices.ids[asset] = coin.id;
      saveCache(prices);
    }
    const coinId = prices.ids[asset];

    // get coin price
    // https://api.coingecko.com/api/v3/coins/bitcoin/history?date=30-12-2017

    // DD-MM-YYYY
    const coingeckoDate = `${date.split("-")[2]}-${date.split("-")[1]}-${date.split("-")[0]}`;
    log.info(`Fetching price of ${asset} on ${coingeckoDate}..`);
    const response = (await axios(
      `${coingeckoUrl}/coins/${coinId}/history?date=${coingeckoDate}`,
    )).data;
    try {
      prices[date][asset] = response.market_data.current_price.usd.toString();
    } catch (e) {
      throw new Error(`Couldn't get price, double check that ${asset} existed on ${coingeckoDate}`);
    }
    saveCache(prices);
  }

  return prices[date][asset];
};
