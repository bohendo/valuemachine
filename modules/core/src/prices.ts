import {
  AssetTypes,
  EthereumAssets,
  DateString,
  emptyPrices,
  DecimalString,
  Logger,
  Prices,
  PricesJson,
  Store,
  StoreKeys,
  TimestampString,
  Transaction,
} from "@finances/types";
import { getLogger } from "@finances/utils";
import axios from "axios";

export const getPrices = ({
  logger,
  store,
  pricesJson,
  unitOfAccount,
}: {
  store: Store;
  logger?: Logger;
  pricesJson?: PricesJson;
  unitOfAccount?: AssetTypes;
}): Prices => {
  const json = pricesJson || store?.load(StoreKeys.Prices) || emptyPrices;
  const save = (json: PricesJson): void => store?.save(StoreKeys.Prices, json);
  const log = (logger || getLogger()).child({ module: "Prices" });
  const defaultUoa = unitOfAccount || AssetTypes.USD;

  log.info(`Loaded prices for ${
    Object.keys(json).length
  } dates from ${pricesJson ? "input" : "store"}`);

  ////////////////////////////////////////
  // Internal helper functions

  const formatDate = (date: DateString | TimestampString): DateString => {
    if (isNaN((new Date(date)).getTime())) {
      throw new Error("Invalid Date");
    } else if ((new Date(date)).getTime() > Date.now()) {
      throw new Error("Date is in the future");
    }
    return (new Date(date)).toISOString().split("T")[0];
  };

  // TODO: add uniswap subgraph apis to get ETH-DEFI pairs
  // Then we can use coingecko only for ETH-FIAT pairs

  const getCoinGeckoPrice = async (
    date: DateString,
    asset: AssetTypes,
    givenUoa: AssetTypes,
  ): Promise<string> => {
    // derived from output of https://api.coingecko.com/api/v3/coins/list
    const uoa = givenUoa || defaultUoa;
    const getCoinId = (asset: AssetTypes): string | undefined => {
      switch (asset.toUpperCase()) {
      case "BAT": return "basic-attention-token";
      case "BCH": return "bitcoin-cash";
      case "BTC": return "bitcoin";
      case "CHERRY": return "cherry";
      case "COMP": return "compound-governance-token";
      case "DAI": return "dai";
      case "ETH": return "ethereum";
      case "GEN": return "daostack";
      case "LTC": return "litecoin";
      case "MKR": return "maker";
      case "REP": return "augur";
      case "SAI": return "sai";
      case "SNT": return "status";
      case "SNX": return "havven";
      case "SNX-OLD": return "havven";
      case "UNI": return "uniswap";
      case "USDC": return "usd-coin";
      case "USDT": return "tether";
      case "WBTC": return "wrapped-bitcoin";
      case "WETH": return "weth";
      case "YFI": return "yearn-finance";
      default: return undefined;
      }
    };
    const coinId = getCoinId(asset);
    if (!coinId) throw new Error(`Asset "${asset}" is not supported`);
    if (!json[date]) json[date] = {};
    if (!json[date][uoa]) json[date][uoa] = {};
    if (!json[date][uoa][asset]) {
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
        json[date][uoa][asset] =
          response?.market_data?.current_price?.[uoa.toLowerCase()]
            .toString().replace(/(\.[0-9]{3})[0-9]+/, "$1");
        log.info(`Success, 1 ${asset} was worth ${
          json[date][uoa][asset]
        } ${uoa} on ${date}`);
      } catch (e) {
        log.warn(response);
        throw new Error(`Price is not available, maybe ${asset} didn't exist on ${date}`);
      }
      save(json);
    }
    return json[date][uoa][asset];
  };

  /* TODO
  const innerGetPrice = (
    date: DateString,
    asset: AssetTypes,
    uoa: AssetTypes,
  ): string | undefined => {
    if (!json[date]) return undefined;
    if (json[date]?.[uoa]?.[asset]) return json[date]?.[uoa]?.[asset];
    if (json[date]?.[uoa]) {
      for (const [subAsset, subPrice] of Object.entries(json[date][uoa])) {
        const innerPrice = innerGetPrice(date, asset, subAsset);
        if (innerPrice) {
        }
      }
    }
  }
  */

  ////////////////////////////////////////
  // External Methods

  const getPrice = (
    rawDate: DateString,
    asset: AssetTypes,
    givenUoa?: AssetTypes,
  ): string | undefined => {
    const date = formatDate(rawDate);
    const uoa = givenUoa || defaultUoa;
    const ethish = ["ETH", "WETH"];
    if (asset === uoa || (ethish.includes(asset) && ethish.includes(uoa))) return "1";
    return json[date]?.[uoa]?.[asset];
  };

  const setPrice = (
    price: DecimalString,
    rawDate: DateString,
    asset: AssetTypes,
    givenUoa?: AssetTypes,
  ): void => {
    const date = formatDate(rawDate);
    const uoa = givenUoa || defaultUoa;
    if (!json[date]) json[date] = {};
    if (!json[date][uoa]) json[date][uoa] = {};
    json[date][uoa][asset] = price;
    save(json);
  };

  const syncPrice = async (
    rawDate: DateString,
    asset: AssetTypes,
    givenUoa: AssetTypes,
  ): Promise<string> => {
    const date = formatDate(rawDate);
    const uoa = givenUoa || defaultUoa;
    return getPrice(date, asset, uoa) || getCoinGeckoPrice(date, asset, uoa);
  };

  const syncTransaction = async (
    tx: Transaction,
    givenUoa?: AssetTypes,
  ): Promise<void> => {
    const date = formatDate(tx.date);
    const uoa = givenUoa || defaultUoa || AssetTypes.ETH;
    const assets = Array.from(new Set([...tx.transfers.map(t => t.assetType)]));
    for (const asset of assets) {
      try {
        Object.entries(tx.prices).forEach(
          ([tmpUoa, tmpPrices]) => Object.entries(tmpPrices).forEach(
            ([tmpAsset, tmpPrice]) => {
              setPrice(tmpPrice, date, tmpAsset as AssetTypes, tmpUoa as AssetTypes);
            }
          )
        );
        if (Object.keys(EthereumAssets).includes(asset)) {
          syncPrice(date, asset, AssetTypes.ETH);
        }
        syncPrice(date, asset, uoa);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return {
    getPrice,
    json,
    setPrice,
    syncPrice,
    syncTransaction,
  };
};
