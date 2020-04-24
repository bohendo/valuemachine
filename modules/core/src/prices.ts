import { DateString, TimestampString } from "@finances/types";
import axios from "axios";
// import { formatEther } from "ethers/utils";

import { ILogger } from "./types";
import { ContextLogger } from "./utils";

const fetchPrice = async (
  asset: string,
  timestamp: TimestampString,
  cache: any,
  logger?: ILogger,
): Promise<string> => {
  const log = new ContextLogger("FetchPriceData", logger);

  const prices = cache.loadPrices();
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
      cache.savePrices(prices);
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
    cache.savePrices(prices);
  }

  return prices[date][asset];
};

export const getPrice = async (
  asset: string,
  date: string,
  cache: any,
  logger?: ILogger,
): Promise<string> =>
  ["USD", "DAI", "SAI"].includes(asset)
    ? "1"
    : ["ETH", "WETH"].includes(asset)
    ? await fetchPrice("ETH", date, cache, logger)
    : asset.toUpperCase().startsWith("C")
    ? "0" // skip compound tokens for now
    : await fetchPrice(asset, date, cache, logger);
