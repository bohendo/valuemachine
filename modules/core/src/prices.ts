import {
  DateString,
  Logger,
  PriceList,
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
    Object.keys(json.all).length
  } dates from ${pricesJson ? "input" : "store"}`);

  const fetchPrice = async (
    timestamp: TimestampString,
    _asset: string,
  ): Promise<string> => {

    // "unwrap" wrapped assets (TODO: do BTC & others too)
    const asset = _asset === "WETH" ? "ETH" : _asset;

    const date = (timestamp.includes("T") ? timestamp.split("T")[0] : timestamp) as DateString;
    const coingeckoUrl = "https://api.coingecko.com/api/v3";

    if (!json.all[date]) {
      json.all[date] = {};
    }

    if (!json.all[date][asset]) {

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
        json.all[date][asset] = response.market_data.current_price.usd
          .toString().replace(/(\.[0-9]{3})[0-9]+/, "$1");
        log.info(`Success, 1 ${asset} was worth $${json.all[date][asset]} on ${date}`);
      } catch (e) {
        throw new Error(`Couldn't get price, make sure that ${asset} existed on ${date}`);
      }
      save(json);
    }

    return json.all[date][asset];
  };

  ////////////////////////////////////////
  // External Methods

  const getAllPricesOn = (
    date: string,
  ): PriceList => json.all[date] || {};

  const getPrice = (
    date: string,
    asset: string,
  ): string | undefined =>
    ["USD", "DAI", "SAI"].includes(asset)
      ? "1"
      : "INR" === asset
        ? "0.013" // TODO: get real INR price from somewhere?
        : ["ETH", "WETH"].includes(asset)
          ? json.all[date]?.["ETH"]
          : json.all[date]?.[asset];

  const syncPrice = async (
    date: string,
    asset: string,
  ): Promise<string> =>
    getPrice(date, asset) || fetchPrice(date, asset);

  return {
    getAllPricesOn,
    getPrice,
    json,
    syncPrice,
  };
};
