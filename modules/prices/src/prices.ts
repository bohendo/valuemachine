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
  before,
  chrono,
  diffBalances,
  getLogger,
  math,
  toTime,
} from "@valuemachine/utils";

import { getCoinGeckoEntries } from "./oracles";
import { findPath } from "./pathfinder";
import {
  Path,
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

  // Maintains chronological ordering
  const insertEntry = (prices: PriceJson, entry: PriceEntry) => {
    let done = false;
    return prices.reduce((newPrices, oldEntry) => {
      if (done) return [...newPrices, oldEntry];
      if (oldEntry.date >= entry.date) {
        if (
          oldEntry.date !== entry.date ||
          oldEntry.asset !== entry.asset ||
          oldEntry.unit !== entry.unit ||
          oldEntry.source !== entry.source
        ) {
          done = true; // Not a duplicate, add this entry & be done
          return [...newPrices, entry, oldEntry];
        } else {
          done = true; // Duplicate, not adding this entry at all
          return [...newPrices, oldEntry];
        }
      } else {
        return [...newPrices, oldEntry];
      }
    }, []);
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

  const interpolate = (
    a: PriceEntry,
    b: PriceEntry,
    d: DateTimeString,
    unit: Asset,
  ): DecString => {
    const [pre, suc] = before(a.date, b.date) ? [a, b] : [b, a];
    const preRate = pre.unit !== unit ? pre.price : math.inv(pre.price);
    const sucRate = suc.unit !== unit ? suc.price : math.inv(suc.price);
    const preTime = toTime(pre.date);
    const sucTime = toTime(suc.date);
    // Assertion prevents divide by zero errors
    if (preTime === sucTime) {
      if (preTime === toTime(d)) {
        // if all dates are equal, return the averge
        return math.div(math.add(preRate, sucRate), "2");
      } else {
        throw new Error(`Times before & after are the same`);
      }
    }
    const slope = math.div(
      math.sub(sucRate, preRate),
      math.sub(sucTime.toString(), preTime.toString()),
    );
    const time = toTime(d);
    const interpolated = math.add(
      preRate,
      math.mul(
        (time - toTime(pre.date)).toString(),
        slope,
      ),
    );
    log.debug(
      `Interpolated a price of ${interpolated} on ${d} between ${
        preRate} on ${pre.date
      } and ${
        sucRate} on ${suc.date
      }`,
    );
    return math.round(interpolated, 8);
  };

  const sumPath = (path: Path, date): DecString => {
    log.trace(path, "Summing path");
    let prev;
    return path.reduce((rate, step) => {
      if (prev) {
        return math.mul(
          rate,
          step.prices.length === 0 ? "1"
          : step.prices.length === 1 ? (
            step.prices[0].unit !== prev ? step.prices[0].price : math.inv(step.prices[0].price)
          ) : step.prices.length === 2 ? interpolate(step.prices[0], step.prices[1], date, prev)
          : "1"
        );
      }
      prev = step.asset;
      return rate;
    }, "1");
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
    givenAsset: Asset,
    givenUnit?: Asset,
  ): DecString | undefined => {
    const [asset, unit] = [toTicker(givenAsset), toTicker(givenUnit || defaultUnit)];
    log.debug(`Getting ${unit} price of ${asset} on date closest to ${date}..`);
    const path = findPath(json, date, asset, unit, log);
    if (!path.length) {
      log.debug(`No path is available between ${unit} and ${asset} on ${date}..`);
      return undefined;
    }
    log.debug(path, `Got path from ${unit} to ${asset} on ${date}..`);
    return formatPrice(sumPath(path, date));
  };

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
      log.warn(`NOT_IMPLEMENTED: Syncing fiat:fiat exchange rates eg ${unit} price of ${asset}`);
      return [];
    } else if (isFiat(asset)) {
      [asset, unit] = [unit, asset]; // If asset is fiat, then swap asset & unit
    }
    // If we already have the data we need to calculate a price w/out interpolation..
    // Then return that price data.. but how? For now return nothing
    const path = findPath(json, date, asset, unit, log);
    if (path.length) return path.reduce((cum, cur) => cum.concat(cur.prices), [] as PriceJson);
    log.info(`A path to the ${unit} price for ${asset} is not available on ${date}, fetching..`);
    return getCoinGeckoEntries(json, date, asset, unit, setPrice, log);
  };

  const syncPrices = async (vm: ValueMachine, givenUnit?: Asset): Promise<PriceJson> => {
    const unit = toTicker(givenUnit || defaultUnit);
    const newPrices = [] as PriceJson;
    vm.json.events.filter(evt => evt.type === EventTypes.Trade).forEach(evt => {
      const trade = vm.getEvent(evt.index) as HydratedTradeEvent;
      const source = `Event#${evt.index}`;
      const [input, output] = diffBalances([sumChunks(trade.inputs), sumChunks(trade.outputs)]);
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

    const oldLen = json.length;
    merge(newPrices);
    log.info(`Merged ${newPrices.length} calculated prices into ${
      oldLen
    } existing prices yielding: ${json.length} total prices`);

    // Sync current prices for presently held assets
    for (const asset of Object.keys(vm.getNetWorth())) {
      const syncedPrices = await syncPrice(toDay(), asset, unit);
      syncedPrices.forEach(entry => insertEntry(newPrices, entry));
    }

    for (const chunk of vm.json.chunks) {
      const { asset, history, disposeDate } = chunk;
      if (unit === asset) continue;
      for (const date of [history[0]?.date, disposeDate]) {
        if (!date) continue;
        // Don't resync any prices that we've already synced
        if (!newPrices.some(entry =>
          entry.date === date && (
            (entry.asset === asset && entry.unit === unit) ||
            (entry.asset === unit && entry.unit === asset)
          )
        )) {
          const syncedPrices = await syncPrice(date, asset, unit);
          syncedPrices.forEach(entry => insertEntry(newPrices, entry));
        }
      }
    }

    return newPrices;
  };

  const getJson = (): PriceJson => {
    return [...json];
  };

  return {
    getJson,
    getPrice,
    merge,
    syncPrice,
    syncPrices,
  };
};
