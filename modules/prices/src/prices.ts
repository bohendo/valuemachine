import {
  AssetChunk,
} from "@valuemachine/core";
import {
  Assets,
  EvmAssets,
  FiatCurrencies,
  publicAddresses,
} from "@valuemachine/transactions";
import {
  Asset,
  Balances,
  DateTimeString,
} from "@valuemachine/types";
import {
  assetsAreClose,
  chrono,
  dedup,
  diffBalances,
  getLogger,
  math,
  toTime,
} from "@valuemachine/utils";
import axios from "axios";

// curl https://api.coingecko.com/api/v3/coins/list
// | jq 'map({ key: .symbol, value: .id }) | from_entries' > ./coingecko.json
import * as coingecko from "./coingecko.json";
import {
  PriceEntry,
  PriceFns,
  PriceJson,
  PricesParams,
} from "./types";
import {
  formatPrice,
  formatUnit,
  getEmptyPrices,
  getPricesError,
} from "./utils";

const { add, div, eq, gt, mul, round } = math;

export const getPriceFns = (params?: PricesParams): PriceFns => {
  const { logger, json: pricesJson, save, unit: defaultUnit } = params || {};
  const json = pricesJson || getEmptyPrices();
  const log = (logger || getLogger()).child({ module: "Prices" });

  const error = getPricesError(json);
  if (error) throw new Error(error);

  ////////////////////////////////////////
  // Internal helper functions

  const retry = async (attempt: () => Promise<any>): Promise<any> => {
    let response;
    try {
      response = await attempt();
    // Try one more time if we get a timeout
    } catch (e) {
      if (e.message.toLowerCase().includes("timeout") || e.message.includes("EAI_AGAIN")) {
        log.warn(`Request timed out, trying one more time..`);
        await new Promise(res => setTimeout(res, 1000)); // short pause
        response = await attempt();
      } else if (e.message.includes("429") || e.message.toLowerCase().includes("rate limit")) {
        log.warn(`We're rate limited, pausing then trying one more time..`);
        await new Promise(res => setTimeout(res, 8000)); // long pause
        response = await attempt();
      } else {
        throw e;
      }
    }
    return response;
  };

  // Given an asset, get a list of other assets that we already have exchange rates for
  const getNeighbors = (date: DateTimeString, asset: Asset): Asset[] =>
    dedup(json.map(entry => {
      if (entry.date !== date) return null;
      else if (entry.asset === asset) return entry.unit;
      else if (entry.unit === asset) return entry.asset;
      else return null;
    }).filter(a => !!a));

  const getPath = (date: DateTimeString, start: Asset, target: Asset): Asset[] => {
    const unvisited = new Set(
      json.filter(entry => entry.date === date).reduce((out, entry) => {
        return [...out, entry.asset, entry.unit];
      }, [] as Asset[])
    );

    const countPrices = (date: DateTimeString, asset?: Asset): number =>
      json.filter(entry => entry.date === date).reduce((count, entry) => {
        if (!asset || entry.unit === asset || entry.asset === asset) return count + 1;
        else return count;
      }, 0);

    if (
      !unvisited.has(start) || !unvisited.has(target) ||
      !countPrices(date, start) || !countPrices(date, target)
    ) {
      log.trace(`${target} to ${start} exchange rate is unavailable on ${date}`);
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
            log.debug(`No exchange-rate-path exists between ${start} and ${target}`);
            log.debug(json.filter(entry => entry.date === date), `Prices we have so far`);
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

  ////////////////////////////////////////
  // Price Oracles

  const getCoinGeckoPrice = async (
    date: DateTimeString,
    asset: Asset,
    givenUnit: Asset,
  ): Promise<string | undefined> => {
    const unit = formatUnit(givenUnit || defaultUnit);
    const coinId = coingecko[asset] || coingecko[asset.toLowerCase()];
    if (!coinId) {
      log.warn(`Asset "${asset}" is not available on CoinGecko`);
      return undefined;
    }
    // eg https://api.coingecko.com/api/v3/coins/bitcoin/history?date=30-12-2017
    const day = date.split("T")[0];
    const coingeckoUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${
      `${day.split("-")[2]}-${day.split("-")[1]}-${day.split("-")[0]}`
    }`;
    log.info(`Fetching ${unit} price of ${asset} on ${day} from ${coingeckoUrl}`);
    const attempt = async () => (await axios.get(coingeckoUrl, { timeout: 10000 })).data;
    let price;
    try {
      const response = await retry(attempt);
      price = response?.market_data?.current_price?.[unit.toLowerCase()]?.toString();
    } catch (e) {
      log.error(e.message);
    }
    if (!price || eq(price, "0")) {
      log.warn(`Could not fetch ${asset} price from CoinGecko on ${day}`);
    }
    return price;
  };

  const getUniswapV1Price = async (
    date: DateTimeString,
    asset: Asset,
  ): Promise<string | undefined> => {
    if (asset === Assets.ETH) return "1";
    const assetId = publicAddresses.find(market =>
      market.name.startsWith("UniV1-") && market.name.endsWith(asset)
    )?.address;
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
    } }) as any)?.data?.data;
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
    date: DateTimeString,
    asset: Asset,
    unit: Asset,
  ): Promise<string | undefined> => {
    const pairId = publicAddresses.find(market =>
      market.name.startsWith(`UniV2-`) &&
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
    } }) as any)?.data?.data;
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
    date: DateTimeString,
    asset: Asset,
    givenUnit: Asset,
  ): Promise<string | undefined> => {
    const uniV1Launch = new Date("2018-11-02").getTime();
    const uniV2Launch = new Date("2020-05-04").getTime();
    const uniV3Launch = new Date("2021-05-04").getTime();
    const time = new Date(date).getTime();
    const unit = formatUnit(givenUnit || defaultUnit);
    // Uniswap was not deployed yet, can't fetch price
    if (time < uniV1Launch) {
      return undefined;
    } else if (time < uniV2Launch) {
      if (unit === Assets.ETH) {
        return await getUniswapV1Price(date, asset);
      } else {
        return undefined;
      }
    } else if (time < uniV3Launch) {
      if (unit === Assets.ETH) {
        return await getUniswapV1Price(date, asset)
          || await getUniswapV2Price(date, asset, Assets.ETH);
      } else {
        return await getUniswapV2Price(date, asset, unit);
      }
    }
    // All uniswap versions are available
    // Use the one with best liquidity?
    // Or should we average all available prices?
    // Or use a liquidity-weighted average?! Fancy
    if (unit === Assets.ETH) {
      return await getUniswapV1Price(date, asset)
        || await getUniswapV2Price(date, asset, Assets.ETH);
      //|| await getUniswapV3Price(date, asset, Assets.ETH);
    } else {
      return await getUniswapV2Price(date, asset, unit);
      //|| await getUniswapV3Price(date, asset, Assets.ETH);
    }
  };

  const setPrice = (
    entry: PriceEntry,
  ): void => {
    const { date, asset, unit } = entry;
    const dup = json.find(oldEntry =>
      oldEntry.date === date && oldEntry.asset === asset && oldEntry.unit === unit
    );
    if (dup) {
      log.debug(`Replacing duplicate ${unit} price for ${asset} on ${date}: ${entry.price}`);
      dup.price = formatPrice(entry.price);
      dup.source = entry.source;
    } else {
      log.debug(`Inserting new ${unit} price for ${asset} on ${date}: ${entry.price}`);
      json.push(entry);
    }
    save?.(json);
  };

  ////////////////////////////////////////
  // Exported Methods

  const merge = (newPrices: PriceJson): void => {
    const error = getPricesError(newPrices);
    if (error) throw new Error(error);
    newPrices.forEach(setPrice);
    json.sort(chrono);
    save?.(json);
  };

  const getPrice = (
    date: DateTimeString,
    asset: Asset,
    givenUnit?: Asset,
  ): string | undefined => {
    const unit = formatUnit(givenUnit || defaultUnit);
    if (assetsAreClose(asset, unit)) return "1";
    // Only entries with the right date are relevant
    const relevant = json.filter(entry => entry.date === date);
    log.debug(`Found ${relevant.length} price entries on ${date}`);
    let entry;
    // Return an exact match if we have one
    entry = relevant.find(entry => entry.unit === unit && entry.asset === asset);
    log.debug(`Exact match: ${entry?.price} ${entry?.unit} per ${entry?.asset}`);
    if (entry) return formatPrice(entry.price);
    // Return the inverse if we have an entry with the asset & unit swapped
    entry = relevant.find(entry => entry.unit === asset && entry.asset === unit);
    log.debug(`Inverse match: ${entry?.price} ${entry?.unit} per ${entry?.asset}`);
    if (entry) return formatPrice(math.div("1", entry.price));
    log.debug(`No matches, calculating path from ${unit} to ${asset}...`);
    const path = getPath(date, unit, asset);
    if (!path.length) return undefined;
    let price = "1"; 
    let prev;
    path.forEach(step => {
      if (prev) {
        entry = relevant.find(e => e.unit === prev && e.asset === step);
        if (entry) {
          price = mul(price, entry.price);
        } else {
          entry = relevant.find(e => e.unit === step && e.asset === prev);
          price = mul(price, div("1", entry.price));
        }
        log.debug(`Got path to price of ${step}: ${formatPrice(price)} ${unit}`);
      }
      prev = step;
    });
    return formatPrice(price);
  };

  const getNearest = (
    date: DateTimeString,
    asset: Asset,
    givenUnit?: Asset,
  ): string | undefined => {
    const unit = formatUnit(givenUnit || defaultUnit);
    log.debug(`Getting ${unit} price of ${asset} on date closest to ${date}..`);
    let price = getPrice(date, asset, givenUnit);
    if (price) return price;
    const diff = (d1, d2) => Math.abs(toTime(d1) - toTime(d2));
    const availableDates = json.map(e => e.date).sort((d1, d2) => {
      return diff(d1, date) - diff(d2, date);
    });
    for (const candidate of availableDates) {
      price = getPrice(candidate, asset, givenUnit);
      if (price) {
        log.debug(`Found ${unit} price of ${asset} on ${candidate}: ${price}`);
        return price;
      }
    }
    return undefined;
  };

  const syncPrice = async (
    date: DateTimeString,
    asset: Asset,
    givenUnit?: Asset,
  ): Promise<string | undefined> => {
    const unit = formatUnit(givenUnit || defaultUnit);
    let source;
    if (assetsAreClose(asset, unit)) return "1";
    if (!getPrice(date, asset, unit)) {
      let price = getPrice(date, asset, unit);
      if (
        !price &&
        Object.keys(EvmAssets).includes(asset) &&
        Object.keys(EvmAssets).includes(unit)
        && !!price // Don't actually use uniswap prices until issue #103 is resolved
      ) {
        price = await getUniswapPrice(date, asset, unit);
        source = "Uniswap";
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
        source = "CoinGecko";
      }
      if (price) {
        setPrice({ date, asset, unit, price: round(price, 18).replace(/0+$/, ""), source });
        log.info(`Synced price on ${date}: 1 ${asset} = ${getPrice(date, asset, unit)} ${unit}`);
      }
    }
    return getPrice(date, asset, unit);
  };

  const syncChunks = async (chunks: AssetChunk[], givenUnit?: Asset): Promise<PriceJson> => {
    const unit = formatUnit(givenUnit || defaultUnit);
    const chunkPrices = [] as PriceJson;
    chunks
      // Gather all the unique dates on which a swap occured
      .reduce((dates, chunk) => {
        if (chunk.disposeDate && chunk.outputs?.length) { // This chunk was traded for something
          dates.push(chunk.disposeDate);
        }
        if (chunk.history[0]?.date && chunk.inputs?.length) { // Something was traded for this chunk
          dates.push(chunk.history[0]?.date);
        }
        return Array.from(new Set(dates));
      }, []).sort(chrono)

      // Gather & sum all the chunks that came in or went out on each date
      .map(date => ({
        date,
        out: chunks.reduce((output, chunk) => {
          if (chunk.disposeDate === date && chunk.outputs?.length && gt(chunk.amount, "0")) {
            output[chunk.asset] = add(output[chunk.asset] || "0", chunk.amount);
          }
          return output;
        }, {} as Balances),
        in: chunks.reduce((input, chunk) => {
          if (chunk.history[0]?.date === date && chunk.inputs?.length && gt(chunk.amount, "0")) {
            input[chunk.asset] = add(input[chunk.asset] || "0", chunk.amount);
          }
          return input;
        }, {} as Balances),
      }))

      // Divide inputs & ouputs to determine exchange rates
      .forEach(swap => {
        const date = swap.date;
        const source = "Calc"; // How could we get access to the txid here?
        // Diff balances just in case refunds weren't processed correctly
        const [outputs, inputs] = diffBalances([swap.out, swap.in]);
        const assets = {
          in: Object.keys(inputs).filter(asset => gt(inputs[asset], "0")),
          out: Object.keys(outputs).filter(asset => gt(outputs[asset], "0")),
        };
        const amts = {
          in: assets.in.map(asset => inputs[asset]),
          out: assets.out.map(asset => outputs[asset]),
        };

        log.info(`Calculating prices on ${date} from swap of [${assets.out}] for [${assets.in}]`);
        // Assumes that the input and output have equal value
        if (assets.in.length === 1 && assets.out.length === 1) {
          const asset = { in: assets.in[0], out: assets.out[0] };
          const amt = { in: amts.in[0], out: amts.out[0] };
          if (eq(amt.in, "0") || eq(amt.out, "0")) return;
          chunkPrices.push({
            date, unit: asset.out, asset: asset.in, price: div(amt.out, amt.in), source,
          });
          chunkPrices.push({
            date, unit: asset.in, asset: asset.out, price: div(amt.in, amt.out), source,
          });


        // Assumes that for 2 inputs => 1 output,
        // - the 2 inputs have equal value
        // - the total input has value equal to the output
        } else if (assets.in.length === 2 && assets.out.length === 1) {
          // Get prices of the two inputs relative to each other
          chunkPrices.push({
            date,
            unit: assets.in[0],
            asset: assets.in[1],
            price: div(amts.in[0], amts.in[1]),
            source,
          });
          chunkPrices.push({
            date,
            unit: assets.in[1],
            asset: assets.in[0],
            price: div(amts.in[1], amts.in[0]),
            source,
          });
          // Get prices of the output relative to each input
          chunkPrices.push({
            date,
            unit: assets.in[1],
            asset: assets.out[0],
            price: div(mul(amts.in[1], "2"), amts.out[0]),
            source,
          });
          chunkPrices.push({
            date,
            unit: assets.in[0],
            asset: assets.out[0],
            price: div(mul(amts.in[0], "2"), amts.out[0]),
            source,
          });

        // Assumes that for 1 input => 2 outputs,
        // - the 2 outputs have equal value
        // - the input has value equal to the total output
        } else if (assets.out.length === 2 && assets.in.length === 1) {
          // Get prices of the two outputs relative to each other
          chunkPrices.push({
            date,
            unit: assets.out[0],
            asset: assets.out[1],
            price: div(amts.out[0], amts.out[1]),
            source,
          });
          chunkPrices.push({
            date,
            unit: assets.out[1],
            asset: assets.out[0],
            price: div(amts.out[1], amts.out[0]),
            source,
          });
          // Get prices of the input relative to each output
          chunkPrices.push({
            date,
            unit: assets.out[1],
            asset: assets.in[0],
            price: div(mul(amts.out[1], "2"), amts.in[0]),
            source,
          });
          chunkPrices.push({
            date,
            unit: assets.out[0],
            asset: assets.in[0],
            price: div(mul(amts.out[0], "2"), amts.in[0]),
            source,
          });

        } else if (assets.in.length || assets.out.length) {
          log.warn(`Unable to get prices from swap: [${assets.out}] => [${assets.in}]`);
        }
      });

    merge(chunkPrices);

    for (const chunk of chunks) {
      const { asset, history, disposeDate } = chunk;
      if (unit === asset) continue;
      for (const rawDate of [history[0]?.date, disposeDate]) {
        const date = rawDate || null;
        if (!date) continue;
        chunkPrices[date] = chunkPrices[date] || {};
        chunkPrices[date][unit] = chunkPrices[date][unit] || {};
        chunkPrices[date][unit][asset] = await syncPrice(date, asset, unit);
      }
    }
    return chunkPrices;
  };

  const getJson = (): PriceJson => {
    return [...json];
  };

  return {
    getJson,
    getNearest,
    getPrice,
    merge,
    setPrice,
    syncChunks,
    syncPrice,
  };
};
