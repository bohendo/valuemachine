import {
  AssetTypes,
  DateString,
  DecimalString,
  emptyPrices,
  EthereumAssets,
  Logger,
  PriceList,
  Prices,
  PricesJson,
  Store,
  StoreKeys,
  TimestampString,
  Transaction,
  TransferCategories,
} from "@finances/types";
import { getLogger, math } from "@finances/utils";
import axios from "axios";

import { v1MarketAddresses } from "./transactions/eth/uniswap";

const { add, div, mul, sub } = math;
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
  const json = pricesJson
    || store?.load(StoreKeys.Prices)
    || JSON.parse(JSON.stringify(emptyPrices));
  const save = (json: PricesJson): void => store?.save(StoreKeys.Prices, json);
  const log = (logger || getLogger()).child({ module: "Prices" });

  const ethish = [ETH, WETH] as AssetTypes[];

  log.info(`Loaded prices for ${
    Object.keys(json).length
  } dates from ${pricesJson ? "input" : "store"}`);

  ////////////////////////////////////////
  // Internal helper functions

  const rmDups = (array: string[]): string[] =>
    Array.from(new Set([...array]));

  const formatDate = (date: DateString | TimestampString): DateString => {
    if (isNaN((new Date(date)).getTime())) {
      throw new Error("Invalid Date");
    } else if ((new Date(date)).getTime() > Date.now()) {
      throw new Error("Date is in the future");
    }
    return (new Date(date)).toISOString().split("T")[0];
  };

  // Never use WETH as UoA, use ETH instead
  const formatUoa = (givenUoa: AssetTypes): AssetTypes => {
    const UoA = givenUoa || unitOfAccount || AssetTypes.ETH;
    return UoA === WETH ? ETH : UoA;
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

  // Given an asset, get a list of other assets that we already have exchange rates for
  const getNeighbors = (date: DateString, asset: AssetTypes): AssetTypes[] => {
    const neighbors = new Set();
    Object.keys(json[date] || {}).forEach(a1 => {
      Object.keys(json[date]?.[a1] || {}).forEach(a2 => {
        if (a1 === asset && a2 !== asset) neighbors.add(a2);
        if (a2 === asset && a1 !== asset) neighbors.add(a1);
      });
    });
    return Array.from(neighbors) as AssetTypes[];
  };

  // https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm#Algorithm
  const getPath = (date: DateString, start: AssetTypes, target: AssetTypes): AssetTypes[] => {
    const unvisited = new Set();
    Object.keys(json[date] || {}).forEach(a1 => {
      unvisited.add(a1);
      Object.keys(json[date]?.[a1] || {}).forEach(a2 => {
        unvisited.add(a2);
      });
    });
    const distances = {} as { [to: string]: { distance: number; path: AssetTypes[]; } };
    for (const val of unvisited.values() as IterableIterator<AssetTypes>) {
      distances[val] = {
        distance: val === start ? 0 : Infinity,
        path: [start],
      };
    }
    log.debug(distances, "Starting distances");
    let current = start;
    let pathToCurrent = distances[current].path;
    while (current) {
      const neighbors = getNeighbors(date, current).filter(node => unvisited.has(node));
      log.debug(`Checking unvisited neighbors of ${current}: ${neighbors.join(", ")}`);
      let closest;
      for (const neighbor of neighbors) {
        const oldDistance = distances[neighbor].distance;
        const oldPathToNeighbor = distances[neighbor].path;
        const newPathToNeighbor = pathToCurrent.concat([neighbor]);
        const newDistance = newPathToNeighbor.length - 1;
        distances[neighbor] = {
          distance: newDistance < oldDistance ? newDistance : oldDistance,
          path: newDistance < oldDistance ? newPathToNeighbor : oldPathToNeighbor,
        };
        if (!closest || distances[neighbor].distance < distances[closest].distance) {
          closest = neighbor;
        }
      }
      unvisited.delete(current);
      if (!closest || distances[closest].distance === Infinity) {
        log.warn(json[date], `No exchange-rate-path exists between ${start} and ${target}`);
        return [];
      } else if (closest === target) {
        pathToCurrent = distances[closest].path;
        break; // Done!
      } else {
        current = closest;
        pathToCurrent = distances[current].path;
      }
    }
    log.info(`Found a path from ${start} to ${target}: ${pathToCurrent.join(", ")}`);
    log.debug(distances, "Final distances");
    return pathToCurrent;
  };

  ////////////////////////////////////////
  // Price Oracles

  // Uni v3 was launched on May 4th 2021
  // Uni v2 was launched on May 4th 2020

  const getUniswapV2Price = async (
    date: DateString,
    asset: AssetTypes,
    UoA: AssetTypes,
  ): Promise<string | undefined> => {
    const pairId = v1MarketAddresses.find(market =>
      (market.name.includes(`-${asset}-`) || market.name.endsWith(`-${asset}`)) &&
      (market.name.includes(`-${UoA}-`) || market.name.endsWith(`-${UoA}`))
    )?.address;
    if (!pairId) {
      log.warn(`Asset pair ${asset}-${UoA} is not available on UniswapV2`);
      return undefined;
    }
    log.info(`Fetching ${UoA} price of ${asset} on ${date} from UniswapV2 market ${pairId}`);
    const url = "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2";
    const attempt = async () => (await axios({ url, method: "post", timeout: 10000, data: {
      query: `{
        exchangeHistoricalDatas(
          where: {
            timestamp_lt: ${Math.round(new Date(date).getTime()/1000)}, 
            exchangeAddress: "${pairId}"
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

  const getUniswapV1Price = async (
    date: DateString,
    asset: AssetTypes,
  ): Promise<string | undefined> => {
    // TODO: support non-ETH UoAs by getting asset-ETH + UoA-ETH prices?
    if (asset === ETH) return "1";
    const assetId = v1MarketAddresses.find(market => market.name.endsWith(asset))?.address;
    if (!assetId) {
      log.warn(`Asset ${asset} is not available on UniswapV1`);
      return undefined;
    }
    log.info(`Fetching ETH price of ${asset} on ${date} from UniswapV1 market ${assetId}`);
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
    const price = response?.exchangeHistoricalDatas?.[0]?.price;
    if (!price) {
      log.warn(`Price is not available, maybe ${asset} didn't exist in UniswapV1 on ${date}`);
      return undefined;
    }
    return div("1", price);
  };

  // Aggregator for all versions of uniswap
  const getUniswapPrice = async (
    date: DateString,
    asset: AssetTypes,
    givenUoa: AssetTypes,
  ): Promise<string | undefined> => {
    const uniV1Launch = new Date("2018-11-02").getTime();
    const uniV2Launch = new Date("2020-05-04").getTime();
    const uniV3Launch = new Date("2021-05-04").getTime();
    const time = new Date(date).getTime();
    const UoA = formatUoa(givenUoa);

    // Uniswap was not deployed yet, can't fetch price
    if (time < uniV1Launch) {
      return undefined;

    } else if (time < uniV2Launch) {
      if (UoA === ETH) {
        return await getUniswapV1Price(date, asset);
      } else {
        return undefined;
      }

    } else if (time < uniV3Launch) {
      if (UoA === ETH) {
        return await getUniswapV1Price(date, asset)
          || await getUniswapV2Price(date, asset, ETH);
      } else {
        return await getUniswapV2Price(date, asset, UoA);
      }
    }

    // All uniswap versions are available
    // TODO: use the one with best liquidity?
    // Or should we average all available prices?
    // Or use a liquidity-weighted average?! Fancy
    if (UoA === ETH) {
      return await getUniswapV1Price(date, asset)
        || await getUniswapV2Price(date, asset, ETH);
      //|| await getUniswapV3Price(date, asset, ETH);
    } else {
      return await getUniswapV2Price(date, asset, UoA);
      //|| await getUniswapV3Price(date, asset, ETH);
    }
  };

  const getCoinGeckoPrice = async (
    date: DateString,
    asset: AssetTypes,
    givenUoa: AssetTypes,
  ): Promise<string | undefined> => {
    // derived from output of https://api.coingecko.com/api/v3/coins/list
    const UoA = formatUoa(givenUoa);
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
    log.debug(`Fetching ${UoA} price of ${asset} on ${date} from ${coingeckoUrl}`);
    const attempt = async () => (await axios.get(coingeckoUrl, { timeout: 10000 })).data;
    const response = await retry(attempt);
    const price = response?.market_data?.current_price?.[UoA.toLowerCase()].toString();
    if (!price) {
      log.warn(`Price is not available, maybe ${asset} didn't exist on ${date}`);
    }
    return price;
  };

  const getSwapPrices = async (tx: Transaction): Promise<PriceList> => {
    const prices = {};
    const swapsIn = tx.transfers.filter(t => t.category === TransferCategories.SwapIn);
    const swapsOut = tx.transfers.filter(t => t.category === TransferCategories.SwapOut);
    const assetsOut = rmDups(swapsOut.map(swap => swap.assetType));
    const assetsIn = rmDups(
      swapsIn
        .map(swap => swap.assetType)
        // If some input asset was refunded, remove this from the output asset list
        .filter(asset => !assetsOut.includes(asset))
    );
    const sum = (acc, cur) => add(acc, cur.quantity);

    if (assetsIn.length === 1 && assetsOut.length === 1) {
      const amtOut = sub(
        swapsOut.reduce(sum, "0"),
        // Subtract refund if present
        swapsIn.filter(swap => swap.assetType === assetsOut[0]).reduce(sum, "0"),
      );
      const amtIn = swapsIn
        .filter(swap => swap.assetType !== assetsOut[0])
        .reduce(sum, "0");
      prices[assetsOut[0]] = prices[assetsOut[0]] || {};
      prices[assetsOut[0]][assetsIn[0]] = div(amtOut, amtIn);
      prices[assetsIn[0]] = prices[assetsIn[0]] || {};
      prices[assetsIn[0]][assetsOut[0]] = div(amtIn, amtOut);

    } else if (assetsIn.length === 2 && assetsOut.length === 1) {
      const amtsIn = assetsIn.map(asset => sub(
        swapsIn.filter(swap => swap.assetType === asset).reduce(sum, "0"),
        // Subtract refund if present
        swapsOut.filter(swap => swap.assetType === asset).reduce(sum, "0"),
      ));
      const amtOut = swapsOut
        .filter(swap => !assetsIn.includes(swap.assetType))
        .reduce(sum, "0");
      // Get prices of the two liq inputs relative to each other
      prices[assetsIn[0]] = prices[assetsIn[0]] || {};
      prices[assetsIn[0]][assetsIn[1]] = div(amtsIn[0], amtsIn[1]);
      prices[assetsIn[1]] = prices[assetsIn[1]] || {};
      prices[assetsIn[1]][assetsIn[0]] = div(amtsIn[1], amtsIn[0]);
      // Get prices of the liq tokens relative to each input
      prices[assetsIn[0]][assetsOut[0]] = div(mul(amtsIn[0], "2"), amtOut);
      prices[assetsIn[1]][assetsOut[0]] = div(mul(amtsIn[1], "2"), amtOut);

    } else if (assetsOut.length === 2 && assetsIn.length === 1) {
      const amtsOut = assetsOut.map(asset => sub(
        swapsOut.filter(swap => swap.assetType === asset).reduce(sum, "0"),
        // Subtract refund if present
        swapsIn.filter(swap => swap.assetType === asset).reduce(sum, "0"),
      ));
      const amtIn = swapsIn
        .filter(swap => !assetsOut.includes(swap.assetType))
        .reduce(sum, "0");
      // Get prices of the two liq inputs relative to each other
      prices[assetsOut[0]] = prices[assetsOut[0]] || {};
      prices[assetsOut[0]][assetsOut[1]] = div(amtsOut[0], amtsOut[1]);
      prices[assetsOut[1]] = prices[assetsOut[1]] || {};
      prices[assetsOut[1]][assetsOut[0]] = div(amtsOut[1], amtsOut[0]);
      // Get prices of the liq tokens relative to each input
      prices[assetsOut[0]][assetsIn[0]] = div(mul(amtsOut[0], "2"), amtIn);
      prices[assetsOut[1]][assetsIn[0]] = div(mul(amtsOut[1], "2"), amtIn);

    } else {
      log.warn(`Unable to get prices from swaps w input=${assetsIn} & output=${assetsOut}`);
    }
    return prices;
  };

  ////////////////////////////////////////
  // External Methods

  const getPrice = (
    rawDate: DateString,
    asset: AssetTypes,
    givenUoa?: AssetTypes,
  ): string | undefined => {
    const date = formatDate(rawDate);
    const UoA = formatUoa(givenUoa);
    log.info(`Getting ${UoA} price of ${asset} on ${date}..`);
    if (asset === UoA || (ethish.includes(asset) && ethish.includes(UoA))) return "1";
    if (json[date]?.[UoA]?.[asset]) return json[date][UoA][asset];
    if (json[date]?.[asset]?.[UoA]) return div("1", json[date][UoA][asset]);
    const path = getPath(date, UoA, asset);
    if (!path.length) return undefined;
    let price = "1"; 
    let prev;
    path.forEach(step => {
      if (prev) {
        if (json[date]?.[prev]?.[step]) {
          price = mul(price, json[date]?.[prev]?.[step]);
        } else if (json[date]?.[step]?.[prev]) {
          price = mul(price, div("1", json[date]?.[step]?.[prev]));
        }
        log.info(`Got price of ${step}: ${price} ${UoA}`);
      }
      prev = step;
    });
    return price;
  };

  const setPrice = (
    price: DecimalString,
    rawDate: DateString,
    asset: AssetTypes,
    givenUoa?: AssetTypes,
  ): void => {
    const date = formatDate(rawDate);
    const UoA = formatUoa(givenUoa);
    if (!json[date]) json[date] = {};
    if (!json[date][UoA]) json[date][UoA] = {};
    json[date][UoA][asset] = price;
    save(json);
  };

  const syncPrice = async (
    rawDate: DateString,
    asset: AssetTypes,
    givenUoa?: AssetTypes,
  ): Promise<string | undefined> => {
    const date = formatDate(rawDate);
    const UoA = formatUoa(givenUoa);
    if (asset === UoA || (ethish.includes(asset) && ethish.includes(UoA))) return "1";
    // log.debug(`Syncing ${UoA} price of ${asset} on ${date}`);
    if (!json[date]) json[date] = {};
    if (!json[date][UoA]) json[date][UoA] = {};
    if (!json[date][UoA][asset]) {
      let price = getPrice(date, asset, UoA);
      if (price) {
        json[date][UoA][asset] = price;
        save(json);
        return json[date][UoA][asset];
      }
      if (
        Object.keys(EthereumAssets).includes(asset) &&
        Object.keys(EthereumAssets).includes(UoA)
      ) {
        price = await getUniswapPrice(date, asset, UoA);
      }
      if (!price) {
        price = await getCoinGeckoPrice(date, asset, UoA);
      }
      if (price) {
        json[date][UoA][asset] = price;
        save(json);
        log.info(`Synced price on ${date}: 1 ${asset} = ${json[date][UoA][asset]} ${UoA}`);
      }
    }
    return json[date][UoA][asset];
  };

  const syncTransaction = async (
    tx: Transaction,
    givenUoa?: AssetTypes,
  ): Promise<void> => {
    const date = formatDate(tx.date);
    const UoA = formatUoa(givenUoa);
    const assets = Array.from(new Set([...tx.transfers.map(t => t.assetType)]));
    for (const asset of assets) {
      try {
        Object.entries(getSwapPrices(tx)).forEach(
          ([tmpUoa, tmpPrices]) => Object.entries(tmpPrices).forEach(
            ([tmpAsset, tmpPrice]) => {
              setPrice(
                tmpPrice as DecimalString,
                date as DateString,
                tmpAsset as AssetTypes,
                tmpUoa as AssetTypes,
              );
            }
          )
        );
        if (Object.keys(EthereumAssets).includes(asset)) {
          await syncPrice(date, asset, AssetTypes.ETH);
        }
        await syncPrice(date, asset, UoA);
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
