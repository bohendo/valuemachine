import {
  sumChunks,
  ValueMachine,
  HydratedTradeEvent,
  EventTypes,
} from "@valuemachine/core";
import {
  FiatCurrencies,
} from "@valuemachine/transactions";
import {
  Asset,
  DateTimeString,
  DecString,
} from "@valuemachine/types";
import {
  after,
  before,
  chrono,
  getLogger,
  math,
  msDiff,
  msPerDay,
  toTime,
} from "@valuemachine/utils";

import { getCoinGeckoEntries } from "./oracles";
import { findPath } from "./dijkstra";
import {
  PriceEntry,
  PriceFns,
  PriceJson,
  PricesParams,
} from "./types";
import {
  formatPrice,
  getEmptyPrices,
  getPricesError,
  toDay,
  toTicker,
} from "./utils";

const { div, mul } = math;

export const getPriceFns = (params?: PricesParams): PriceFns => {
  const { logger, json: pricesJson, save, unit: defaultUnit } = params || {};
  const json = pricesJson || getEmptyPrices();
  const log = (logger || getLogger()).child({ module: "Prices" });

  const error = getPricesError(json);
  if (error) throw new Error(error);

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

  const getExact = (
    date: DateTimeString,
    givenAsset: Asset,
    givenUnit?: Asset,
  ): DecString | undefined => {
    const [asset, unit] = [toTicker(givenAsset), toTicker(givenUnit || defaultUnit)];
    if (toTicker(asset) === unit) return "1";
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
    givenAsset: Asset,
    givenUnit?: Asset,
  ): DecString | undefined => {
    const [asset, unit] = [toTicker(givenAsset), toTicker(givenUnit || defaultUnit)];
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

  // If we're syncing the price at 2pm..
  // fetch prices for midnight on that day & the next day if not present..
  // and return the 2 price entries required for interpolation
  //
  // If we're syncing USD:cDAI and we already have USD:ETH, ETH:DAI, DAI:cDAI rates..
  // then what should we return?
  // [] because we don't need to sync anything?
  // [USD:ETH, ETH:DAI, DAI:cDAI] bc that's what's needed to calculate an answer to the request?
  // The later is better but idk how to return that... :(
  //
  const syncPrice = async (
    date: DateTimeString,
    givenAsset: Asset,
    givenUnit?: Asset,
  ): Promise<PriceJson> => {
    let [asset, unit] = [toTicker(givenAsset), toTicker(givenUnit || defaultUnit)];
    if (!asset || !unit) return []; // eg if asset is unsupported or has no value
    if (asset === unit) return []; // Exchange rate is 1:1, nothing to sync
    log.debug(`Syncing ${unit} price of ${asset} on ${date}`);
    const isFiat = a => Object.keys(FiatCurrencies).includes(a);
    if (isFiat(asset) && isFiat(unit)) {
      log.warn(`NOT_IMPLEMENTED: Syncing fiat:fiat exchange rates`);
      return [];
    } else if (isFiat(asset)) {
      [asset, unit] = [unit, asset]; // If asset is fiat, then swap asset & unit
    }
    // If we already have the data we need to calculate a price w/out interpolation..
    // Then return that price data.. but how? For now return nothing
    const price = getExact(date, asset, unit);
    if (price) return [/*TODO: return entries needed to calc the path from asset to unit*/];
    log.info(`An exact ${unit} price for ${asset} is not available on ${date}, fetching..`);
    return getCoinGeckoEntries(json, date, asset, unit, setPrice, log);
  };

  const syncPrices = async (vm: ValueMachine, givenUnit?: Asset): Promise<PriceJson> => {
    const unit = toTicker(givenUnit || defaultUnit);
    const newPrices = [] as PriceJson;
    vm.json.events.filter(evt => evt.type === EventTypes.Trade).forEach(evt => {
      const trade = vm.getEvent(evt.index) as HydratedTradeEvent;
      const source = `Event#${evt.index}`;
      const input = sumChunks(trade.inputs);
      const output = sumChunks(trade.outputs);
      const inAssets = Object.keys(input).sort();
      const outAssets = Object.keys(output).sort();
      log.info(`Calculating prices on ${trade.date} from swap of [${inAssets}] for [${outAssets}]`);

      // We're only saving one of eg ETH:DAI or DAI:ETH bc we don't need both
      // The one that sorts first is biased towards being treated as the unit

      // Assumes that the input and output have equal value
      if (inAssets.length === 1 && outAssets.length === 1) {
        newPrices.push({
          date: trade.date,
          unit: outAssets[0],
          asset: inAssets[0],
          price: div(output[outAssets[0]], input[inAssets[0]]),
          source,
        });

      // Assumes that for 2 inputs => 1 output,
      // - the 2 inputs have equal value
      // - the total input has value equal to the output
      } else if (inAssets.length === 2 && outAssets.length === 1) {
        // Get prices of the two inputs relative to each other
        newPrices.push({
          date: trade.date,
          unit: inAssets[0],
          asset: inAssets[1],
          price: div(input[inAssets[0]], input[inAssets[1]]),
          source,
        });
        // Get prices of the output relative to each input
        newPrices.push({
          date: trade.date,
          unit: inAssets[0],
          asset: outAssets[0],
          price: div(mul(input[inAssets[0]], "2"), output[outAssets[0]]),
          source,
        });

      // Assumes that for 1 input => 2 outputs,
      // - the 2 outputs have equal value
      // - the input has value equal to the total output
      } else if (outAssets.length === 2 && inAssets.length === 1) {
        // Get prices of the two outputs relative to each other
        newPrices.push({
          date: trade.date,
          unit: outAssets[0],
          asset: outAssets[1],
          price: div(output[outAssets[0]], output[outAssets[1]]),
          source,
        });
        // Get prices of the input relative to each output
        newPrices.push({
          date: trade.date,
          unit: outAssets[0],
          asset: inAssets[0],
          price: div(mul(output[outAssets[0]], "2"), input[inAssets[0]]),
          source,
        });

      } else if (inAssets.length || outAssets.length) {
        log.warn(`Unable to calculate prices from swap: [${inAssets}] => [${outAssets}]`);
      }
    });

    merge(newPrices);

    for (const chunk of vm.json.chunks) {
      const { asset, history, disposeDate } = chunk;
      if (unit === asset) continue;
      for (const rawDate of [history[0]?.date, disposeDate]) {
        const date = rawDate || null;
        if (!date) continue;
        newPrices.push(...(await syncPrice(date, asset, unit)));
      }
    }

    // Sync current prices for presently held assets
    for (const asset of Object.keys(vm.getNetWorth())) {
      newPrices.push(...(await syncPrice(toDay(), asset, unit)));
    }

    return newPrices;
  };

  const getJson = (): PriceJson => {
    return [...json];
  };

  return {
    getExact,
    getJson,
    getPrice,
    merge,
    syncPrice,
    syncPrices,
  };
};
