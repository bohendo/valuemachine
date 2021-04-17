import {
  DateString,
  Logger,
  Prices,
  PricesJson,
  Store,
  StoreKeys,
  TimestampString,
} from "@finances/types";
import { getLogger } from "@finances/utils";
import axios from "axios";

export const getPrices = ({
  logger,
  store,
  pricesJson
}: {
  store: Store;
  logger?: Logger;
  pricesJson?: PricesJson;
}): Prices => {
  const json = pricesJson || store.load(StoreKeys.Prices);
  const save = (json: PricesJson): void => store.save(StoreKeys.Prices, json);
  const log = (logger || getLogger()).child({ module: "Prices" });

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
      log.info(`Fetching price of ${asset} on ${date}..`);
      let response;
      try {
        response = (await axios.get(
          `${coingeckoUrl}/coins/${coinId}/history?date=${coingeckoDate}`,
          { timeout: 10000 },
        )).data;
      // Try one more time if we get a failure
      } catch (e) {
        log.warn(e.message);
        if (e.message.includes("timeout") || e.message.includes("EAI_AGAIN")) {
          log.info(`Trying to fetch price of ${asset} on ${date} one more time..`);
          response = (await axios.get(
            `${coingeckoUrl}/coins/${coinId}/history?date=${coingeckoDate}`,
            { timeout: 10000 },
          )).data;
        } else {
          throw e;
        }
      }
      try {
        json[date][asset] = response.market_data.current_price.usd
          .toString().replace(/(\.[0-9]{3})[0-9]+/, "$1");
        log.info(`Success, 1 ${asset} was worth $${json[date][asset]} on ${date}`);
      } catch (e) {
        throw new Error(`Couldn't get price, make sure that ${asset} existed on ${date}`);
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
      : "INR" === asset
        ? "0.013"
        : ["ETH", "WETH"].includes(asset)
          ? await fetchPrice("ETH", date)
          : asset.toUpperCase().startsWith("C")
            ? "0" // skip compound tokens for now
            : await fetchPrice(asset, date);


  return { json, getPrice };
};
