import {
  AssetTypes,
  DateString,
  DecimalString,
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

  ////////////////////////////////////////
  // Internal helper functions

  const formatDate = (date: DateString | TimestampString): DateString => {
    if (!date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
      throw new Error("Improperly formatted date");
    } else if (isNaN((new Date(date)).getTime())) {
      throw new Error("Invalid Date");
    } else if ((new Date(date)).getTime() > Date.now()) {
      throw new Error("Date is in the future");
    } else if ((new Date(date)).getDate() === (new Date()).getDate()) {
      throw new Error("Date is today");
    }
    return (new Date(date)).toISOString().split("T")[0];
  };

  const getCoinGeckoPrice = async (
    date: DateString,
    asset: AssetTypes,
  ): Promise<string> => {
    // derived from output of https://api.coingecko.com/api/v3/coins/list
    const getCoinId = (asset: AssetTypes): string | undefined => {
      switch (asset.toUpperCase()) {
      case "BAT": return "basic-attention-token";
      case "BCH": return "bitcoin-cash";
      case "BTC": return "bitcoin";
      case "CDAI": return "cdai";
      case "COMP": return "compound-governance-token";
      case "DAI": return "dai";
      case "ETH": return "ethereum";
      case "GEN": return "daostack";
      case "LTC": return "litecoin";
      case "MKR": return "maker";
      case "SAI": return "sai";
      case "SNT": return "status";
      case "SNX": return "havven";
      case "UNI": return "uniswap";
      case "WBTC": return "wrapped-bitcoin";
      case "WETH": return "weth";
      default: return undefined;
      }
    };
    const coinId = getCoinId(asset);
    if (!coinId) throw new Error(`Asset "${asset}" is not supported`);
    if (!json[date]) json[date] = {};
    if (!json[date][asset]) {
      // eg https://api.coingecko.com/api/v3/coins/bitcoin/history?date=30-12-2017
      const coingeckoUrl = `https://api.coingecko.com/api/v3/coins/${
        coinId 
      }/history?date=${
        `${date.split("-")[2]}-${date.split("-")[1]}-${date.split("-")[0]}`
      }`;
      log.info(`Fetching price of ${asset} on ${date} from ${coingeckoUrl}`);
      let response;
      try {
        response = (await axios.get(coingeckoUrl, { timeout: 10000 })).data;
      // Try one more time if we get a failure
      } catch (e) {
        log.warn(e.message);
        if (e.message.includes("timeout") || e.message.includes("EAI_AGAIN")) {
          log.info(`Trying to fetch price of ${asset} on ${date} one more time..`);
          response = (await axios.get(coingeckoUrl, { timeout: 10000 })).data;
        } else {
          throw e;
        }
      }
      try {
        json[date][asset] = response.market_data.current_price.usd
          .toString().replace(/(\.[0-9]{3})[0-9]+/, "$1");
        log.info(`Success, 1 ${asset} was worth $${json[date][asset]} on ${date}`);
      } catch (e) {
        log.warn(response);
        throw new Error(`Price is not available, maybe ${asset} didn't exist on ${date}`);
      }
      save(json);
    }
    return json[date][asset];
  };

  ////////////////////////////////////////
  // External Methods

  const getPrice = (
    _date: DateString,
    asset: AssetTypes,
  ): string | undefined => {
    const date = formatDate(_date);
    return "USD" === asset
      ? "1"
      : "INR" === asset
        ? "0.013" // TODO: get real INR price from somewhere?
        : ["ETH", "WETH"].includes(asset)
          ? json[date]?.["ETH"]
          : json[date]?.[asset];
  };

  const setPrice = (
    _date: DateString,
    asset: AssetTypes,
    price: DecimalString,
  ): void => {
    const date = formatDate(_date);
    if (!json[date]) json[date] = {};
    json[date][asset] = price;
  };

  const syncPrice = async (
    _date: DateString,
    asset: AssetTypes,
  ): Promise<string> => {
    const date = formatDate(_date);
    return getPrice(date, asset) || getCoinGeckoPrice(date, asset);
  };

  return {
    getPrice,
    json,
    setPrice,
    syncPrice,
  };
};
