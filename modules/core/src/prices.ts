import {
  DateString,
  Logger,
  Prices,
  PricesJson,
  Store,
  StoreKeys,
  TimestampString,
} from "@finances/types";
import { ContextLogger } from "@finances/utils";
import axios from "axios";

export const getPrices = (store: Store, logger: Logger, pricesJson?: PricesJson): Prices => {
  const json = pricesJson || store.load(StoreKeys.Prices);
  const save = (json: PricesJson): void => store.save(StoreKeys.Prices, json);
  const log = new ContextLogger("Prices", logger);

  log.info(`Loaded prices for ${
    Object.keys(json).length
  } dates from ${pricesJson ? "input" : "store"}`);

  const fetchPrice = async (
    asset: string,
    timestamp: TimestampString,
  ): Promise<string> => {

    const date = (timestamp.includes("T") ? timestamp.split("T")[0] : timestamp) as DateString;
    const coingeckoUrl = "https://api.coingecko.com/api/v3";

    if (!json[date]) {
      json[date] = {};
    }

    if (!json[date][asset]) {

      // get coin id
      if (!json.ids[asset]) {
        log.info(`Fetching coin id for ${asset}..`);
        const coins = (await axios(`${coingeckoUrl}/coins/list`)).data;
        const coin = coins.find(coin => coin.symbol.toLowerCase() === asset.toLowerCase());
        if (!coin || !coin.id) {
          throw new Error(`Asset ${asset} is not supported by coingecko`);
        }
        json.ids[asset] = coin.id;
        save(json);
      }
      const coinId = json.ids[asset];

      // get coin price
      // https://api.coingecko.com/api/v3/coins/bitcoin/history?date=30-12-2017

      // DD-MM-YYYY
      const coingeckoDate = `${date.split("-")[2]}-${date.split("-")[1]}-${date.split("-")[0]}`;
      log.info(`Fetching price of ${asset} on ${coingeckoDate}..`);
      const response = (await axios(
        `${coingeckoUrl}/coins/${coinId}/history?date=${coingeckoDate}`,
      )).data;
      try {
        json[date][asset] = response.market_data.current_price.usd.toString();
      } catch (e) {
        throw new Error(`Couldn't get price, double check that ${asset} existed on ${coingeckoDate}`);
      }
      save(json);
    }

    return json[date][asset];
  };

  const getPrice = async (
    asset: string,
    date: string,
  ): Promise<string> =>
    ["USD", "DAI", "SAI"].includes(asset)
      ? "1"
      : ["ETH", "WETH"].includes(asset)
      ? await fetchPrice("ETH", date)
      : asset.toUpperCase().startsWith("C")
      ? "0" // skip compound tokens for now
      : await fetchPrice(asset, date);


  return { json, getPrice };
};
