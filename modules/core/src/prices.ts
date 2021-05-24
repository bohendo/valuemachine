import {
  AssetTypes,
  DateString,
  DecimalString,
  emptyPrices,
  EthereumAssets,
  FiatAssets,
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

import { v1MarketAddresses, v2MarketAddresses } from "./transactions/eth/uniswap";

const { add, div, eq, gt, mul, sub } = math;
const {
  BAT, BCH, BTC, CHERRY, COMP, DAI, ETH, GEN, GNO, LTC, MKR, OMG,
  REP, REPv1, SAI, SNT, SNX, SNXv1, SPANK, UNI, USDC, USDT, WBTC, WETH, YFI
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

  log.debug(`Loaded prices for ${
    Object.keys(json).length
  } dates from ${pricesJson ? "input" : "store"}`);

  ////////////////////////////////////////
  // Internal helper functions

  // Limit value from having any more than 18 decimals of precision (but ensure it has at least 1)
  const formatPrice = (price: DecimalString): DecimalString => {
    const truncated = math.round(price, 18).replace(/0+$/, "");
    if (truncated.endsWith(".")) return truncated + "0";
    return truncated;
  };

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

  const getPath = (date: DateString, start: AssetTypes, target: AssetTypes): AssetTypes[] => {
    const unvisited = new Set();
    Object.keys(json[date] || {}).forEach(a1 => {
      unvisited.add(a1);
      Object.keys(json[date]?.[a1] || {}).forEach(a2 => {
        unvisited.add(a2);
      });
    });
    const countPrices = (date: DateString, asset?: AssetTypes): number => {
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
    const distances = {} as { [to: string]: { distance: number; path: AssetTypes[]; } };
    for (const val of unvisited.values() as IterableIterator<AssetTypes>) {
      distances[val] = {
        distance: val === start ? 0 : Infinity,
        path: [start],
      };
    }
    let current = start;
    const branches = [] as AssetTypes[];
    let pathToCurrent = distances[current].path;
    while (current) {
      const neighbors = getNeighbors(date, current).filter(node => unvisited.has(node));
      log.debug(`Checking unvisited neighbors of ${current}: ${neighbors.join(", ")}`);
      let closest;
      if (!branches.includes(current) && neighbors.length > 1) {
        branches.push(current);
        log.info(`New branch set at ${current}`);
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
            log.info(`Returning to prev branch at ${current}`);
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
    if (assetsIn.length === 0 && assetsOut.length === 0) {
      log.debug(`No swaps detected`);
      return prices;
    } else if (assetsIn.length === 1 && assetsOut.length === 1) {
      log.info(`Parsing swap w 1 asset out (${assetsOut}) & 1 in (${assetsIn})`);
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
      log.info(`Parsing swap w 1 asset out (${assetsOut}) & 2 in (${assetsIn})`);
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
      log.info(`Parsing swap w 2 assets out (${assetsOut}) & 1 in (${assetsIn})`);
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
      log.warn(`Unable to get prices from swap w input=${assetsIn} & output=${assetsOut}`);
    }
    log.debug(prices, `Got prices for tx swaps`);
    return prices;
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
    json[date][UoA][asset] = formatPrice(price);
    save(json);
  };

  ////////////////////////////////////////
  // Price Oracles

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
      case GNO: return "gnosis";
      case LTC: return "litecoin";
      case MKR: return "maker";
      case OMG: return "omisego";
      case REP: return "augur";
      case REPv1: return "augur";
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
    log.info(`Fetching ${UoA} price of ${asset} on ${date} from ${coingeckoUrl}`);
    const attempt = async () => (await axios.get(coingeckoUrl, { timeout: 10000 })).data;
    let price;
    try {
      const response = await retry(attempt);
      price = response?.market_data?.current_price?.[UoA.toLowerCase()]?.toString();
      // Might as well set other fiat currency prices since they've already been fetched
      Object.keys(FiatAssets).forEach(fiat => {
        const otherPrice = response?.market_data?.current_price?.[fiat.toLowerCase()]?.toString();
        if (otherPrice) {
          log.debug(`Also setting ${asset} price on ${date} wrt ${fiat}: ${otherPrice}`);
          setPrice(otherPrice, date, asset, fiat as AssetTypes);
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
    asset: AssetTypes,
    UoA: AssetTypes,
  ): Promise<string | undefined> => {
    const pairId = v2MarketAddresses.find(market =>
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

  ////////////////////////////////////////
  // External Methods

  const getCount = (
    UoA?: AssetTypes,
    date?: DateString,
  ): number => {
    const countPrices = (d: DateString, u?: AssetTypes): number => {
      let count = 0;
      Object.keys(json[d] || {}).forEach(tmpUoA => {
        if (!u || u === tmpUoA) {
          count += Object.keys(json[d]?.[tmpUoA] || {}).length;
        }
      });
      return count;
    };
    if (date) {
      return countPrices(date, UoA);
    } else {
      return Object.keys(json).reduce((acc, date) => {
        return acc + countPrices(date, UoA);
      }, 0);
    }
  };

  const getPrice = (
    rawDate: DateString,
    asset: AssetTypes,
    givenUoa?: AssetTypes,
  ): string | undefined => {
    const date = formatDate(rawDate);
    const UoA = formatUoa(givenUoa);
    log.debug(`Getting ${UoA} price of ${asset} on ${date}..`);
    if (asset === UoA || (ethish.includes(asset) && ethish.includes(UoA))) return "1";
    if (json[date]?.[UoA]?.[asset]) return formatPrice(json[date][UoA][asset]);
    if (json[date]?.[asset]?.[UoA]) return formatPrice(div("1", json[date][asset][UoA]));
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
        log.info(`Got price of ${step}: ${formatPrice(price)} ${UoA}`);
      }
      prev = step;
    });
    return formatPrice(price);
  };

  const merge = (prices: PricesJson): void => {
    Object.entries(prices).forEach(([date, priceList]) => {
      Object.entries(priceList).forEach(([UoA, prices]) => {
        Object.entries(prices).forEach(([asset, price]) => {
          if (
            typeof price === "string" &&
            typeof date === "string" &&
            typeof asset === "string" &&
            typeof UoA === "string"
          ) {
            log.debug(`Merging ${UoA} price for ${asset} on ${date}: ${price}`);
            setPrice(
              price as DecimalString,
              date as DateString,
              asset as AssetTypes,
              UoA as AssetTypes,
            );
          } else {
            log.warn(`NOT merging ${UoA} price for ${asset} on ${date}: ${price}`);
          }
        });
      });
    });
  };

  const syncPrice = async (
    rawDate: DateString,
    asset: AssetTypes,
    givenUoa?: AssetTypes,
  ): Promise<string | undefined> => {
    const date = formatDate(rawDate);
    const UoA = formatUoa(givenUoa);
    if (asset === UoA || (ethish.includes(asset) && ethish.includes(UoA))) return "1";
    log.info(`Syncing ${UoA} price of ${asset} on ${date}`);
    if (!json[date]) json[date] = {};
    if (!json[date][UoA]) json[date][UoA] = {};
    if (!json[date][UoA][asset]) {
      let price = getPrice(date, asset, UoA);
      if (
        !price &&
        Object.keys(EthereumAssets).includes(asset) &&
        Object.keys(EthereumAssets).includes(UoA)
      ) {
        price = await getUniswapPrice(date, asset, UoA);
      }
      if (!price) {
        if (Object.keys(FiatAssets).includes(asset)) {
          const inversePrice = await getCoinGeckoPrice(date, UoA, asset);
          if (inversePrice && gt(inversePrice, "0")) {
            price = div("1", inversePrice);
            log.debug(`Got ${asset} per ${UoA} price & inversed it to ${price}`);
          }
        } else {
          price = await getCoinGeckoPrice(date, asset, UoA);
        }
      }
      if (price) {
        setPrice(math.round(price, 18).replace(/0+$/, ""), date, asset, UoA);
        log.info(`Synced price on ${date}: 1 ${asset} = ${json[date][UoA][asset]} ${UoA}`);
      }
    }
    return json[date][UoA][asset];
  };

  // Returns subset of prices relevant to this tx
  const syncTransaction = async (
    tx: Transaction,
    givenUoa?: AssetTypes,
  ): Promise<PricesJson> => {
    const date = formatDate(tx.date);
    const UoA = formatUoa(givenUoa);
    const priceList = {} as PriceList;
    // Set exchange rates based on this transaction's swaps in & out
    Object.entries(getSwapPrices(tx)).forEach(([tmpUoa, tmpPrices]) => {
      Object.entries(tmpPrices).forEach(([tmpAsset, tmpPrice]) => {
        log.debug(`Found swap price on ${date} for ${tmpAsset} of ${tmpPrice} ${tmpUoa}`);
        setPrice(
          tmpPrice as DecimalString,
          date as DateString,
          tmpAsset as AssetTypes,
          tmpUoa as AssetTypes,
        );
        if (UoA === tmpUoa && tmpAsset !== UoA) {
          priceList[UoA] = priceList[UoA] || {};
          priceList[UoA][tmpAsset] = tmpPrice;
        }
      });
    });
    const assets = Array.from(new Set([...tx.transfers.map(t => t.assetType)]));
    // First, sync all ETH/DEFI prices
    for (const asset of assets.filter(a => Object.keys(EthereumAssets).includes(a))) {
      try {
        // TODO: If we have a rate for 2 non-ETH Etheum assets (eg DAI/cDAI),
        // check which one is has a more liquid uniswap pool
        // has a more reliable exchange rate & sync prices for that pair (eg fetch ETH/DAI)
        // then calculate the exchange rate of the other (eg ETH/cDAI = ETH/DAI * DAI/cDAI)
        await syncPrice(date, asset, AssetTypes.ETH);
      } catch (e) {
        log.error(e);
      }
    }
    // Then, if UoA isn't ETH, sync all FIAT/DEFI prices from FIAT/ETH * ETH/DEFI
    for (const asset of assets) {
      try {
        if (asset !== UoA) {
          priceList[UoA] = priceList[UoA] || {};
          priceList[UoA][asset] = await syncPrice(date, asset, UoA);
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
