import {
  AssetChunk,
} from "@valuemachine/core";
import {
  EvmAssets,
  FiatCurrencies,
} from "@valuemachine/transactions";
import {
  Asset,
  Balances,
  DateTimeString,
  DecString,
} from "@valuemachine/types";
import {
  after,
  assetsAreClose,
  before,
  chrono,
  diffBalances,
  getLogger,
  math,
  msDiff,
  msPerDay,
  toTime,
} from "@valuemachine/utils";

import { fetchCoinGeckoPrice, fetchUniswapPrice } from "./oracles";
import { findPath } from "./dijkstra";
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
  // Exported Methods

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

  const merge = (newPrices: PriceJson): void => {
    const error = getPricesError(newPrices);
    if (error) throw new Error(error);
    newPrices.forEach(setPrice);
    json.sort(chrono);
    save?.(json);
  };

  const getExact = (
    date: DateTimeString,
    asset: Asset,
    givenUnit?: Asset,
  ): DecString | undefined => {
    const unit = formatUnit(givenUnit || defaultUnit);
    if (assetsAreClose(asset, unit)) return "1";
    // Only entries with the exact right date should be considered
    const rates = json.filter(entry => entry.date === date);
    log.debug(`Found ${rates.length} price entries on ${date}`);
    let entry;
    // Return an exact match if we have one
    entry = rates.find(entry => entry.unit === unit && entry.asset === asset);
    if (entry) {
      log.debug(`Exact match: ${entry?.price} ${entry?.unit} per ${entry?.asset}`);
      return formatPrice(entry.price);
    }
    // Return the inverse if we have an entry with the asset & unit swapped
    entry = rates.find(entry => entry.unit === asset && entry.asset === unit);
    if (entry) {
      log.debug(`Inverse match: ${entry?.price} ${entry?.unit} per ${entry?.asset}`);
      return formatPrice(math.inv(entry.price));
    }
    log.debug(`Direct rate is not available, searching for a path from ${unit} to ${asset}...`);
    const path = findPath(json, date, unit, asset, log);
    if (!path.length) {
      log.debug(`No path is available between ${unit} and ${asset} on ${date}..`);
      return undefined;
    }
    let price = "1"; 
    let prev;
    path.forEach(step => {
      if (prev) {
        entry = rates.find(e => e.unit === prev && e.asset === step);
        if (entry) {
          price = mul(price, entry.price);
        } else {
          entry = rates.find(e => e.unit === step && e.asset === prev);
          price = mul(price, div("1", entry.price));
        }
        log.debug(`Got path to price of ${step}: ${formatPrice(price)} ${unit}`);
      }
      prev = step;
    });
    return formatPrice(price);
  };

  const getPrice = (
    date: DateTimeString,
    asset: Asset,
    givenUnit?: Asset,
  ): DecString | undefined => {
    const unit = formatUnit(givenUnit || defaultUnit);
    log.debug(`Getting ${unit} price of ${asset} on date closest to ${date}..`);
    const price = getExact(date, asset, givenUnit);
    if (price) return price;
    // Get all price entries for this asset/unit pair
    const rates = json.filter(entry => (
      (entry.asset === asset && entry.unit === unit) || 
      (entry.unit === asset && entry.asset === unit)
    )).sort(chrono);
    // Get the newest rate that's before the given date
    const preceeding = rates.filter(entry => before(entry.date, date)).pop();
    // Get the oldest rate that's after the given date
    const succeeding = rates.filter(entry => after(entry.date, date))[0];
    if (!preceeding && !succeeding) {
      return undefined;
    } else if (preceeding && !succeeding) {
      log.warn(
        `No exchange rates are available after ${date}, returning the rate from ${preceeding.date}`
      );
      return preceeding.asset === asset ? preceeding.price : math.inv(preceeding.price);
    } else if (!preceeding && succeeding) {
      log.warn(
        `No exchange rates are available before ${date}, returning the rate from ${succeeding.date}`
      );
      return succeeding.asset === asset ? succeeding.price : math.inv(succeeding.price);
    } else if (preceeding && succeeding) {
      if (msDiff(preceeding.date, date) > 7 * msPerDay) log.warn(
        `Exchange rate before (${preceeding.date}) is >7 days from target date ${date}`
      );
      if (msDiff(succeeding.date, date) > 7 * msPerDay) log.warn(
        `Exchange rate after (${succeeding.date}) is >7 days from target date ${date}`
      );
      const rateBefore = preceeding.asset === asset ? preceeding.price : math.inv(preceeding.price);
      const rateAfter = succeeding.asset === asset ? succeeding.price : math.inv(succeeding.price);
      const timeBefore = toTime(preceeding.date);
      const timeAfter = toTime(succeeding.date);
      // Assertion prevents divide by zero errors
      if (timeBefore === timeAfter) throw new Error(`Times before & after are the same`);
      const slope = math.div(
        math.sub(rateAfter, rateBefore),
        math.sub(timeAfter.toString(), timeBefore.toString()),
      );
      const time = toTime(date);
      const interpolated = math.add(
        rateBefore,
        math.mul(
          (time - toTime(preceeding.date)).toString(),
          slope,
        ),
      );
      log.debug(
        `Interpolated a price of ${interpolated} on ${date} between ${
          rateBefore} on ${preceeding.date
        } and ${
          rateAfter} on ${succeeding.date
        }`,
      );
      return interpolated;
    }
    return undefined;
  };

  const syncPrice = async (
    date: DateTimeString,
    asset: Asset,
    givenUnit?: Asset,
  ): Promise<DecString | undefined> => {
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
        price = await fetchUniswapPrice(date, asset, unit);
        source = "Uniswap";
      }
      if (!price) {
        if (Object.keys(FiatCurrencies).includes(asset)) {
          const inversePrice = await fetchCoinGeckoPrice(date, unit, asset, log);
          if (inversePrice && gt(inversePrice, "0")) {
            price = div("1", inversePrice);
            log.debug(`Got ${asset} per ${unit} price & inversed it to ${price}`);
          }
        } else {
          price = await fetchCoinGeckoPrice(date, asset, unit, log);
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
    getExact,
    getJson,
    getPrice,
    merge,
    setPrice,
    syncChunks,
    syncPrice,
  };
};
