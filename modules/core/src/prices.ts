import {
  Assets,
  Asset,
  DateString,
  DecimalString,
  emptyPrices,
  EthereumAssets,
  FiatCurrencies,
  Logger,
  PriceList,
  Prices,
  PricesJson,
  Store,
  StoreKeys,
  TimestampString,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import axios from "axios";

import { add, div, eq, gt, mul, round, sub } from "./math";
import { v1MarketAddresses, v2MarketAddresses } from "./transactions/eth/uniswap";
import { getLogger } from "./utils";

const {
  BAT, BCH, BTC, CHERRY, COMP, DAI, ETH, GEN, GNO, LTC, MKR, OMG,
  REP, REPv2, SAI, SNT, SNX, SNXv1, SPANK, UNI, USDC, USDT, WBTC, WETH, YFI
} = Assets;
const { SwapIn, SwapOut } = TransferCategories;
export const getPrices = ({
  logger,
  store,
  pricesJson,
  unit: defaultUnit,
}: {
  store: Store;
  logger?: Logger;
  pricesJson?: PricesJson;
  unit?: Asset;
}): Prices => {
  const json = pricesJson
    || store?.load(StoreKeys.Prices)
    || JSON.parse(JSON.stringify(emptyPrices));
  const save = (json: PricesJson): void => store?.save(StoreKeys.Prices, json);
  const log = (logger || getLogger()).child({ module: "Prices" });

  const ethish = [ETH, WETH] as Asset[];

  log.debug(`Loaded prices for ${
    Object.keys(json).length
  } dates from ${pricesJson ? "input" : "store"}`);

  ////////////////////////////////////////
  // Internal helper functions

  // Limit value from having any more than 18 decimals of precision (but ensure it has at least 1)
  const formatPrice = (price: DecimalString): DecimalString => {
    const truncated = round(price, 18).replace(/0+$/, "");
    if (truncated.endsWith(".")) return truncated + "0";
    return truncated;
  };

  const rmDups = (array: string[]): string[] =>
    Array.from(new Set([...array]));

  const formatDate = (date: DateString | TimestampString): DateString => {
    if (isNaN((new Date(date)).getTime())) {
      throw new Error(`Invalid Date: "${date}"`);
    } else if ((new Date(date)).getTime() > Date.now()) {
      throw new Error(`Date is in the future: "${date}"`);
    }
    return (new Date(date)).toISOString().split("T")[0];
  };

  // Never use WETH as unit, use ETH instead
  const formatUnit = (givenUnit: Asset): Asset => {
    const unit = givenUnit || defaultUnit || ETH;
    return unit === WETH ? ETH : unit;
  };

  const retry = async (attempt: () => Promise<any>): Promise<any> => {
    let response;
    try {
      response = await attempt();
    // Try one more time if we get a timeout
    } catch (e) {
      log.warn(e.message);
      if (e.message.toLowerCase().includes("timeout") || e.message.includes("EAI_AGAIN")) {
        log.debug(`Trying to fetch price one more time..`);
        response = await attempt();
      } else {
        throw e;
      }
    }
    return response;
  };

  // Given an asset, get a list of other assets that we already have exchange rates for
  const getNeighbors = (date: DateString, asset: Asset): Asset[] => {
    const neighbors = new Set();
    Object.keys(json[date] || {}).forEach(a1 => {
      Object.keys(json[date]?.[a1] || {}).forEach(a2 => {
        if (a1 === asset && a2 !== asset) neighbors.add(a2);
        if (a2 === asset && a1 !== asset) neighbors.add(a1);
      });
    });
    return Array.from(neighbors) as Asset[];
  };

  const getPath = (date: DateString, start: Asset, target: Asset): Asset[] => {
    const unvisited = new Set();
    Object.keys(json[date] || {}).forEach(a1 => {
      unvisited.add(a1);
      Object.keys(json[date]?.[a1] || {}).forEach(a2 => {
        unvisited.add(a2);
      });
    });
    const countPrices = (date: DateString, asset?: Asset): number => {
      let count = 0;
      Object.keys(json[date] || {}).forEach(a1 => {
        Object.keys(json[date]?.[a1] || {}).forEach(a2 => {
          if (!asset || (a1 === asset || a2 === asset)) count += 1;
        });
      });
      return count;
    };
    if (
      !unvisited.has(start) || !unvisited.has(target) ||
      !countPrices(date, start) || !countPrices(date, target)
    ) {
      log.info(`${target} to ${start} exchange rate is unavailable on ${date}`);
      return [];
    }
    const distances = {} as { [to: string]: { distance: number; path: Asset[]; } };
    for (const val of unvisited.values() as IterableIterator<Asset>) {
      distances[val] = {
        distance: val === start ? 0 : Infinity,
        path: [start],
      };
    }
    let current = start;
    const branches = [] as Asset[];
    let pathToCurrent = distances[current].path;
    while (current) {
      const neighbors = getNeighbors(date, current).filter(node => unvisited.has(node));
      log.debug(`Checking unvisited neighbors of ${current}: ${neighbors.join(", ")}`);
      let closest;
      if (!branches.includes(current) && neighbors.length > 1) {
        branches.push(current);
        log.debug(`New branch set at ${current}`);
      }
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
        // Done searching this branch, did we find what we were looking for?
        if (distances[target]?.distance < Infinity) {
          pathToCurrent = distances[target].path;
          break; // Done!
        } else {
          // Are there any other unvisited nodes to check?
          if (!branches.length || unvisited.size === 0) {
            log.info(json[date], `No exchange-rate-path exists between ${start} and ${target}`);
            log.debug(distances, `Final distances from ${start} to ${target}`);
            return [];
          } else {
            // Return to the start?
            current = branches.pop();
            log.debug(`Returning to prev branch at ${current}`);
            pathToCurrent = distances[current].path;
          }
        }
      } else if (closest === target) {
        pathToCurrent = distances[closest].path;
        break; // Done!
      } else {
        current = closest;
        pathToCurrent = distances[current].path;
      }
    }
    log.info(`Found a path from ${start} to ${target}: ${pathToCurrent.join(", ")}`);
    log.debug(distances, `Final distances from ${start} to ${target}`);
    return pathToCurrent;
  };

  const getSwapPrices = (tx: Transaction): PriceList => {
    const prices = {};
    const swapsIn = tx.transfers.filter(t => t.category === SwapIn);
    const swapsOut = tx.transfers.filter(t => t.category === SwapOut);
    const assetsOut = rmDups(swapsOut.map(swap => swap.asset));
    const assetsIn = rmDups(
      swapsIn
        .map(swap => swap.asset)
        // If some input asset was refunded, remove this from the output asset list
        .filter(asset => !assetsOut.includes(asset))
    );
    const sum = (acc, cur) => add(acc, cur.quantity);
    if (assetsIn.length === 0 && assetsOut.length === 0) {
      log.debug(`No swaps detected`);
      return prices;
    } else if (assetsIn.length === 1 && assetsOut.length === 1) {
      log.info(`Parsing swap w 1 asset out (${assetsOut}) & 1 in (${assetsIn})`);
      const amtOut = sub(
        swapsOut.reduce(sum, "0"),
        // Subtract refund if present
        swapsIn.filter(swap => swap.asset === assetsOut[0]).reduce(sum, "0"),
      );
      const amtIn = swapsIn
        .filter(swap => swap.asset !== assetsOut[0])
        .reduce(sum, "0");
      prices[assetsOut[0]] = prices[assetsOut[0]] || {};
      prices[assetsOut[0]][assetsIn[0]] = div(amtOut, amtIn);
      prices[assetsIn[0]] = prices[assetsIn[0]] || {};
      prices[assetsIn[0]][assetsOut[0]] = div(amtIn, amtOut);
    } else if (assetsIn.length === 2 && assetsOut.length === 1) {
      log.info(`Parsing swap w 1 asset out (${assetsOut}) & 2 in (${assetsIn})`);
      const amtsIn = assetsIn.map(asset => sub(
        swapsIn.filter(swap => swap.asset === asset).reduce(sum, "0"),
        // Subtract refund if present
        swapsOut.filter(swap => swap.asset === asset).reduce(sum, "0"),
      ));
      const amtOut = swapsOut
        .filter(swap => !assetsIn.includes(swap.asset))
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
      log.info(`Parsing swap w 2 assets out (${assetsOut}) & 1 in (${assetsIn})`);
      const amtsOut = assetsOut.map(asset => sub(
        swapsOut.filter(swap => swap.asset === asset).reduce(sum, "0"),
        // Subtract refund if present
        swapsIn.filter(swap => swap.asset === asset).reduce(sum, "0"),
      ));
      const amtIn = swapsIn
        .filter(swap => !assetsOut.includes(swap.asset))
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
      log.warn(`Unable to get prices from swap w input=${assetsIn} & output=${assetsOut}`);
    }
    log.debug(prices, `Got prices for tx swaps`);
    return prices;
  };

  const setPrice = (
    price: DecimalString,
    rawDate: DateString,
    asset: Asset,
    givenUnit?: Asset,
  ): void => {
    const date = formatDate(rawDate);
    const unit = formatUnit(givenUnit);
    if (!json[date]) json[date] = {};
    if (!json[date][unit]) json[date][unit] = {};
    json[date][unit][asset] = formatPrice(price);
    save(json);
  };

  ////////////////////////////////////////
  // Price Oracles

  const getCoinGeckoPrice = async (
    date: DateString,
    asset: Asset,
    givenUnit: Asset,
  ): Promise<string | undefined> => {
    // derived from output of https://api.coingecko.com/api/v3/coins/list
    const unit = formatUnit(givenUnit);
    const getCoinId = (asset: Asset): string | undefined => {
      switch (asset) {
      case BAT: return "basic-attention-token";
      case BCH: return "bitcoin-cash";
      case BTC: return "bitcoin";
      case CHERRY: return "cherry";
      case COMP: return "compound-governance-token";
      case DAI: return "dai";
      case ETH: return "ethereum";
      case GEN: return "daostack";
      case GNO: return "gnosis";
      case LTC: return "litecoin";
      case MKR: return "maker";
      case OMG: return "omisego";
      case REP: return "augur";
      case REPv2: return "augur";
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
    log.info(`Fetching ${unit} price of ${asset} on ${date} from ${coingeckoUrl}`);
    const attempt = async () => (await axios.get(coingeckoUrl, { timeout: 10000 })).data;
    let price;
    try {
      const response = await retry(attempt);
      price = response?.market_data?.current_price?.[unit.toLowerCase()]?.toString();
      // Might as well set other fiat currency prices since they've already been fetched
      // TODO: This is nice server-side but should prob be disabled client-side
      Object.keys(FiatCurrencies).forEach(fiat => {
        const otherPrice = response?.market_data?.current_price?.[fiat.toLowerCase()]?.toString();
        if (otherPrice) {
          log.debug(`Also setting ${asset} price on ${date} wrt ${fiat}: ${otherPrice}`);
          setPrice(otherPrice, date, asset, fiat as Asset);
        }
      });
    } catch (e) {
      log.error(e.message);
    }
    if (!price || eq(price, "0")) {
      log.warn(`Could not fetch ${asset} price from CoinGecko on ${date}`);
    }
    return price;
  };

  const getUniswapV1Price = async (
    date: DateString,
    asset: Asset,
  ): Promise<string | undefined> => {
    // TODO: support non-ETH units by getting asset-ETH + unit-ETH prices?
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
    let price;
    try {
      const response = await retry(attempt);
      price = response?.exchangeHistoricalDatas?.[0]?.price;
    } catch (e) {
      log.error(e.message);
    }
    if (!price || eq(price, "0")) {
      log.warn(`Could not fetch ${asset} price from UniswapV1 on ${date}`);
      return undefined;
    }
    return div("1", price);
  };

  const getUniswapV2Price = async (
    date: DateString,
    asset: Asset,
    unit: Asset,
  ): Promise<string | undefined> => {
    const pairId = v2MarketAddresses.find(market =>
      (market.name.includes(`-${asset}-`) || market.name.endsWith(`-${asset}`)) &&
      (market.name.includes(`-${unit}-`) || market.name.endsWith(`-${unit}`))
    )?.address;
    if (!pairId) {
      log.warn(`Asset pair ${asset}-${unit} is not available on UniswapV2`);
      return undefined;
    }
    log.info(`Fetching ${unit} price of ${asset} on ${date} from UniswapV2 market ${pairId}`);
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
    let price;
    try {
      const response = await retry(attempt);
      log.debug(response, "Got uniswap v2 response");
      price = response?.exchangeHistoricalDatas?.[0]?.price;
    } catch (e) {
      log.error(e.message);
    }
    if (!price || eq(price, "0")) {
      log.warn(`Could not fetch ${asset} price from UniswapV2 on ${date}`);
      return undefined;
    }
    return div("1", price);
  };

  // Aggregator for all versions of uniswap
  const getUniswapPrice = async (
    date: DateString,
    asset: Asset,
    givenUnit: Asset,
  ): Promise<string | undefined> => {
    const uniV1Launch = new Date("2018-11-02").getTime();
    const uniV2Launch = new Date("2020-05-04").getTime();
    const uniV3Launch = new Date("2021-05-04").getTime();
    const time = new Date(date).getTime();
    const unit = formatUnit(givenUnit);
    // Uniswap was not deployed yet, can't fetch price
    if (time < uniV1Launch) {
      return undefined;
    } else if (time < uniV2Launch) {
      if (unit === ETH) {
        return await getUniswapV1Price(date, asset);
      } else {
        return undefined;
      }
    } else if (time < uniV3Launch) {
      if (unit === ETH) {
        return await getUniswapV1Price(date, asset)
          || await getUniswapV2Price(date, asset, ETH);
      } else {
        return await getUniswapV2Price(date, asset, unit);
      }
    }
    // All uniswap versions are available
    // TODO: use the one with best liquidity?
    // Or should we average all available prices?
    // Or use a liquidity-weighted average?! Fancy
    if (unit === ETH) {
      return await getUniswapV1Price(date, asset)
        || await getUniswapV2Price(date, asset, ETH);
      //|| await getUniswapV3Price(date, asset, ETH);
    } else {
      return await getUniswapV2Price(date, asset, unit);
      //|| await getUniswapV3Price(date, asset, ETH);
    }
  };

  ////////////////////////////////////////
  // External Methods

  const getCount = (
    unit?: Asset,
    date?: DateString,
  ): number => {
    const countPrices = (d: DateString, u?: Asset): number => {
      let count = 0;
      Object.keys(json[d] || {}).forEach(tmpunit => {
        if (!u || u === tmpunit) {
          count += Object.keys(json[d]?.[tmpunit] || {}).length;
        }
      });
      return count;
    };
    if (date) {
      return countPrices(date, unit);
    } else {
      return Object.keys(json).reduce((acc, date) => {
        return acc + countPrices(date, unit);
      }, 0);
    }
  };

  const getPrice = (
    rawDate: DateString,
    asset: Asset,
    givenUnit?: Asset,
  ): string | undefined => {
    const date = formatDate(rawDate);
    const unit = formatUnit(givenUnit);
    log.debug(`Getting ${unit} price of ${asset} on ${date}..`);
    if (asset === unit || (ethish.includes(asset) && ethish.includes(unit))) return "1";
    if (json[date]?.[unit]?.[asset]) return formatPrice(json[date][unit][asset]);
    if (json[date]?.[asset]?.[unit]) return formatPrice(div("1", json[date][asset][unit]));
    const path = getPath(date, unit, asset);
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
        log.debug(`Got price of ${step}: ${formatPrice(price)} ${unit}`);
      }
      prev = step;
    });
    return formatPrice(price);
  };

  const merge = (prices: PricesJson): void => {
    Object.entries(prices).forEach(([date, priceList]) => {
      Object.entries(priceList).forEach(([unit, prices]) => {
        Object.entries(prices).forEach(([asset, price]) => {
          if (
            typeof price === "string" &&
            typeof date === "string" &&
            typeof asset === "string" &&
            typeof unit === "string"
          ) {
            log.debug(`Merging ${unit} price for ${asset} on ${date}: ${price}`);
            setPrice(
              price as DecimalString,
              date as DateString,
              asset as Asset,
              unit as Asset,
            );
          } else {
            log.warn(`NOT merging ${unit} price for ${asset} on ${date}: ${price}`);
          }
        });
      });
    });
  };

  const syncPrice = async (
    rawDate: DateString,
    asset: Asset,
    givenUnit?: Asset,
  ): Promise<string | undefined> => {
    const date = formatDate(rawDate);
    const unit = formatUnit(givenUnit);
    if (asset === unit || (ethish.includes(asset) && ethish.includes(unit))) return "1";
    log.debug(`Syncing ${unit} price of ${asset} on ${date}`);
    if (!json[date]) json[date] = {};
    if (!json[date][unit]) json[date][unit] = {};
    if (!json[date][unit][asset]) {
      let price = getPrice(date, asset, unit);
      if (
        !price &&
        Object.keys(EthereumAssets).includes(asset) &&
        Object.keys(EthereumAssets).includes(unit)
        && !!price // Don't actually use uniswap prices until issue #103 is resolved
      ) {
        price = await getUniswapPrice(date, asset, unit);
      }
      if (!price) {
        if (Object.keys(FiatCurrencies).includes(asset)) {
          const inversePrice = await getCoinGeckoPrice(date, unit, asset);
          if (inversePrice && gt(inversePrice, "0")) {
            price = div("1", inversePrice);
            log.debug(`Got ${asset} per ${unit} price & inversed it to ${price}`);
          }
        } else {
          price = await getCoinGeckoPrice(date, asset, unit);
        }
      }
      if (price) {
        setPrice(round(price, 18).replace(/0+$/, ""), date, asset, unit);
        log.info(`Synced price on ${date}: 1 ${asset} = ${json[date][unit][asset]} ${unit}`);
      }
    }
    return json[date][unit][asset];
  };

  // Returns subset of prices relevant to this tx
  const syncTransaction = async (
    tx: Transaction,
    givenUnit?: Asset,
  ): Promise<PricesJson> => {
    const date = formatDate(tx.date);
    const unit = formatUnit(givenUnit);
    const priceList = {} as PriceList;
    // Set exchange rates based on this transaction's swaps in & out
    Object.entries(getSwapPrices(tx)).forEach(([tmpUnit, tmpPrices]) => {
      Object.entries(tmpPrices).forEach(([tmpAsset, tmpPrice]) => {
        log.debug(`Found swap price on ${date} for ${tmpAsset} of ${tmpPrice} ${tmpUnit}`);
        setPrice(
          tmpPrice as DecimalString,
          date as DateString,
          tmpAsset as Asset,
          tmpUnit as Asset,
        );
        if (unit === tmpUnit && tmpAsset !== unit) {
          priceList[unit] = priceList[unit] || {};
          priceList[unit][tmpAsset] = tmpPrice;
        }
      });
    });
    const assets = Array.from(new Set([...tx.transfers.map(t => t.asset)]));
    // First, sync all ETH/DEFI prices
    for (const asset of assets.filter(a => Object.keys(EthereumAssets).includes(a))) {
      try {
        // TODO: If we have a rate for 2 non-ETH Etheum assets (eg DAI/cDAI),
        // check which one is has a more liquid uniswap pool
        // has a more reliable exchange rate & sync prices for that pair (eg fetch ETH/DAI)
        // then calculate the exchange rate of the other (eg ETH/cDAI = ETH/DAI * DAI/cDAI)
        await syncPrice(date, asset, ETH);
      } catch (e) {
        log.error(e);
      }
    }
    // Then, if unit isn't ETH, sync all FIAT/DEFI prices from FIAT/ETH * ETH/DEFI
    for (const asset of assets) {
      try {
        if (asset !== unit) {
          priceList[unit] = priceList[unit] || {};
          priceList[unit][asset] = await syncPrice(date, asset, unit);
        }
      } catch (e) {
        log.error(e);
      }
    }
    return { [date]: priceList };
  };

  return {
    getCount,
    getPrice,
    json,
    merge,
    syncPrice,
    syncTransaction,
  };
};
