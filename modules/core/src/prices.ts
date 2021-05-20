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
import { getLogger, math } from "@finances/utils";
import axios from "axios";

import { v1MarketAddresses } from "./transactions/eth/uniswap";

const { div } = math;
const {
  BAT, BCH, BTC, CHERRY, COMP, DAI, ETH, GEN, LTC, MKR, REP,
  SAI, SNT, SNX, SNXv1, SPANK, UNI, USDC, USDT, WBTC, WETH, YFI
} = AssetTypes;

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

  const ethish = [ETH, WETH] as AssetTypes[];

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

  // Never use WETH as uoa, use ETH instead
  const formatUoa = (givenUoa: AssetTypes): AssetTypes => {
    const uoa = givenUoa || unitOfAccount || AssetTypes.ETH;
    return uoa === WETH ? ETH : uoa;
  };

  const retry = async (attempt: () => Promise<any>): Promise<any> => {
    let response;
    try {
      response = await attempt();
    // Try one more time if we get a timeout
    } catch (e) {
      log.warn(e.message);
      if (e.message.toLowerCase().includes("timeout") || e.message.includes("EAI_AGAIN")) {
        log.info(`Trying to fetch price one more time..`);
        response = await attempt();
      } else {
        throw e;
      }
    }
    return response;
  };

  ////////////////////////////////////////
  // Price Oracles

  // Uni v2 was launched on May 4th 2020
  // Uni v3 was launched on May 4th 2021

  // Uni v1 was launched on Nov 2nd 2018
  const getUniswapV1Price = async (
    date: DateString,
    asset: AssetTypes,
  ): Promise<string> => {
    if (asset === ETH) return "1";
    const assetId = v1MarketAddresses.find(market => market.name.endsWith(asset))?.address;
    if (!assetId) {
      log.warn(`Asset "${asset}" is not available on UniswapV1`);
      return undefined;
    }
    log.info(`Fetching price of ${asset} on ${date} from UniswapV1 market ${assetId}`);
    const url = "https://api.thegraph.com/subgraphs/name/graphprotocol/uniswap";
    const attempt = async () => (await axios({ url, method: "post", timeout: 10000, data: {
      query: `{
        exchangeHistoricalDatas(
          where: {
            timestamp_lt: ${Math.round(new Date(date).getTime()/1000)}, 
            exchangeAddress: "${assetId}"
          },
          first: 1,
          orderBy: timestamp,
          orderDirection: desc
        ) {
          timestamp
          price
        }
      }`
    } })).data.data;
    const response = await retry(attempt);
    log.debug(response, "Got uniswap v1 response");
    const price = response?.exchangeHistoricalDatas?.[0]?.price;
    if (!price) {
      log.warn(`Price is not available, maybe ${asset} didn't exist in UniswapV1 on ${date}`);
      return undefined;
    }
    return div("1", price);
  };

  const getCoinGeckoPrice = async (
    date: DateString,
    asset: AssetTypes,
    givenUoa: AssetTypes,
  ): Promise<string | undefined> => {
    // derived from output of https://api.coingecko.com/api/v3/coins/list
    const uoa = formatUoa(givenUoa);
    const getCoinId = (asset: AssetTypes): string | undefined => {
      switch (asset) {
      case BAT: return "basic-attention-token";
      case BCH: return "bitcoin-cash";
      case BTC: return "bitcoin";
      case CHERRY: return "cherry";
      case COMP: return "compound-governance-token";
      case DAI: return "dai";
      case ETH: return "ethereum";
      case GEN: return "daostack";
      case LTC: return "litecoin";
      case MKR: return "maker";
      case REP: return "augur";
      case SAI: return "sai";
      case SNT: return "status";
      case SNX: return "havven";
      case SNXv1: return "havven";
      case SPANK: return "spankchain";
      case UNI: return "uniswap";
      case USDC: return "usd-coin";
      case USDT: return "tether";
      case WBTC: return "wrapped-bitcoin";
      case WETH: return "weth";
      case YFI: return "yearn-finance";
      default: return undefined;
      }
    };
    const coinId = getCoinId(asset);
    if (!coinId) {
      log.warn(`Asset "${asset}" is not available on CoinGecko`);
      return undefined;
    }
    // eg https://api.coingecko.com/api/v3/coins/bitcoin/history?date=30-12-2017
    const coingeckoUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${
      `${date.split("-")[2]}-${date.split("-")[1]}-${date.split("-")[0]}`
    }`;
    log.debug(`Fetching price of ${asset} on ${date} from ${coingeckoUrl}`);
    const attempt = async () => (await axios.get(coingeckoUrl, { timeout: 10000 })).data;
    const response = await retry(attempt);
    const price = response?.market_data?.current_price?.[uoa.toLowerCase()].toString();
    if (!price) {
      log.warn(`Price is not available, maybe ${asset} didn't exist on ${date}`);
    }
    return price;
  };

  ////////////////////////////////////////
  // External Methods

  const getPrice = (
    rawDate: DateString,
    asset: AssetTypes,
    givenUoa?: AssetTypes,
  ): string | undefined => {
    const date = formatDate(rawDate);
    const uoa = formatUoa(givenUoa);
    if (asset === uoa || (ethish.includes(asset) && ethish.includes(uoa))) return "1";
    // TODO: fancier djikstra graph search
    return json[date]?.[uoa]?.[asset];
  };

  const setPrice = (
    price: DecimalString,
    rawDate: DateString,
    asset: AssetTypes,
    givenUoa?: AssetTypes,
  ): void => {
    const date = formatDate(rawDate);
    const uoa = formatUoa(givenUoa);
    if (!json[date]) json[date] = {};
    if (!json[date][uoa]) json[date][uoa] = {};
    json[date][uoa][asset] = price;
    save(json);
  };

  const syncPrice = async (
    rawDate: DateString,
    asset: AssetTypes,
    givenUoa?: AssetTypes,
  ): Promise<string | undefined> => {
    const date = formatDate(rawDate);
    const uoa = formatUoa(givenUoa);
    // log.debug(`Syncing ${uoa} price of ${asset} on ${date}`);
    if (!json[date]) json[date] = {};
    if (!json[date][uoa]) json[date][uoa] = {};
    if (!json[date][uoa][asset]) {
      let price = getPrice(date, asset, uoa);
      if (price) {
        json[date][uoa][asset] = price;
        save(json);
        return json[date][uoa][asset];
      }
      if (uoa === ETH) {
        price = await getUniswapV1Price(date, asset);
      }
      if (!price) {
        price = await getCoinGeckoPrice(date, asset, uoa);
      }
      if (price) {
        json[date][uoa][asset] = price;
        save(json);
      }
      log.info(`Synced price on ${date}: 1 ${asset} = ${json[date][uoa][asset]} ${uoa}`);
    }
    return json[date][uoa][asset];
  };

  const syncTransaction = async (
    tx: Transaction,
    givenUoa?: AssetTypes,
  ): Promise<void> => {
    const date = formatDate(tx.date);
    const uoa = formatUoa(givenUoa);
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
          await syncPrice(date, asset, AssetTypes.ETH);
        }
        await syncPrice(date, asset, uoa);
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
