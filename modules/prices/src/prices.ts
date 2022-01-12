import {
  sumChunks,
  ValueMachine,
  HydratedTradeEvent,
  EventTypes,
} from "@valuemachine/core";
import {
  Asset,
  DateTimeString,
} from "@valuemachine/types";
import {
  dedup,
  diffBalances,
  getLogger,
  math,
  msPerDay,
  toTime,
} from "@valuemachine/utils";

import { getCoinGeckoEntries } from "./oracles";
import { findPath } from "./pathfinder";
import {
  MissingPrices,
  Path,
  PriceEntry,
  PriceFns,
  PriceJson,
  PricesParams,
} from "./types";
import {
  getEmptyPrices,
  getPricesError,
  toDay,
  toNextDay,
  toTicker,
} from "./utils";

export const getPriceFns = (params?: PricesParams): PriceFns => {
  const { logger, json: pricesJson, save, unit: defaultUnit } = params || {};
  const json = pricesJson || getEmptyPrices();
  const log = (logger || getLogger()).child({ name: "Prices" });

  const error = getPricesError(json);
  if (error) throw new Error(error);

  const setPrice = (
    entry: PriceEntry,
  ): void => {
    const { time, asset, unit } = entry;
    const dup = json.find(oldEntry =>
      oldEntry.time === time && oldEntry.asset === asset && oldEntry.unit === unit
    );
    if (dup) {
      log.debug(`Replacing duplicate ${unit} price for ${asset} on ${time}: ${entry.price}`);
      dup.price = entry.price;
      dup.source = entry.source;
    } else {
      log.debug(`Inserting new ${unit} price for ${asset} on ${time}: ${entry.price}`);
      json.push(entry);
    }
    json.sort((p1, p2) => p1.time - p2.time);
    save?.(json);
  };

  // Interpolate a price between the two entries
  // or extrapolate if one of the two entries is missing
  // If a limit is given, we won't interpolate or extrapolate across more ms than the limit
  const infer = (
    a: PriceEntry,
    b: PriceEntry,
    time: number,
    unit: Asset,
    limit?: number, // max ms to infer across
  ): number => {
    const [pre, suc] = a?.time < b?.time ? [a, b] : [b, a];
    // Extrapolate if one of the two entries is missing
    if (!suc && pre) {
      if (!limit || time - pre.time < limit) {
        return pre.price;
      } else {
        throw new Error(`Not extrapolating across more than ${limit}ms: ${time - pre.time}ms`);
      }
    }
    if (!pre && suc) {
      if (!limit || suc.time - time < limit) {
        return suc.price;
      } else {
        throw new Error(`Not extrapolating across more than ${limit}ms: ${suc.time - time}ms`);
      }
    }
    if (!pre && !suc) throw new Error(`Can't infer across two undefined points`);
    const preRate = pre.unit !== unit ? pre.price : 1/pre.price;
    const sucRate = suc.unit !== unit ? suc.price : 1/suc.price;
    // avoid divide by zero errors
    if (pre.time === suc.time) {
      if (pre.time === time) {
        // if all dates are equal, return the averge
        return (preRate + sucRate) / 2;
      } else {
        throw new Error(`Times before & after are the same`);
      }
    }
    if (limit && suc.time - pre.time > limit) {
      throw new Error(`Not interpolating across more than ${limit}ms: ${suc.time - pre.time}ms`);
    }
    const slope = (sucRate - preRate) / (suc.time - pre.time);
    const interpolated = preRate + (slope * (time - pre.time));
    log.debug(
      `Interpolated a price of ${interpolated} on ${time} between ${
        preRate} on ${pre.time
      } and ${
        sucRate} on ${suc.time
      }`,
    );
    return interpolated;
  };

  const sumPath = (path: Path, time: number): number => {
    log.trace(path, "Summing path");
    let prev;
    return path.reduce((rate, step) => {
      if (prev) {
        return rate * (
          step.prices.length === 0 ? 1 : step.prices.length === 1 ? (
            step.prices[0].unit !== prev ? step.prices[0].price : 1/step.prices[0].price
          ) : step.prices.length === 2 ? infer(step.prices[0], step.prices[1], time, prev)
          : 1
        );
      }
      prev = step.asset;
      return rate;
    }, 1);
  };

  const getRequiredPrices = (vm: ValueMachine, givenUnit?: Asset): MissingPrices => {
    const unit = toTicker(givenUnit || defaultUnit);
    const required = {} as MissingPrices;
    // Current prices of presently held assets are required
    for (const asset of Object.keys(vm.getNetWorth())) {
      required[asset] = required[asset] || [];
      required[asset].push(toDay());
    }
    // Prices at each chunk's receive & dispose dates are required
    for (const chunk of vm.json.chunks) {
      const { amount, asset, history, disposeDate } = chunk;
      if (!amount) continue; // Prices can't be reliably retrieved for NFTs, skip them
      if (unit === asset) continue; // Prices not required if asset === unit bc it's trivially 1
      const receive = history[0]?.date;
      if (!receive) {
        log.warn(`No receive date for chunk #${chunk.index} of ${chunk.amount} ${chunk.asset}`);
        continue;
      }
      for (const date of [receive, disposeDate]) {
        if (!date) continue; // Held chunks don't have a dispose date
        required[asset] = required[asset] || [];
        required[asset].push(toDay(date));
      }
    }
    // Remove duplicates & sort
    for (const asset of Object.keys(required)) {
      required[asset] = dedup(required[asset]).sort();
    }
    return required;
  };

  ////////////////////////////////////////
  // Exported Methods

  const merge = (newPrices: PriceJson): void => {
    const error = getPricesError(newPrices);
    if (error) throw new Error(error);
    newPrices.forEach(setPrice);
    save?.(json);
  };

  const getPrice = (
    givenTime: DateTimeString | number,
    givenAsset: Asset,
    givenUnit?: Asset,
    limit?: number,
  ): number | undefined => {
    const time = typeof givenTime === "string" ? toTime(givenTime) : givenTime;
    const [asset, unit] = [toTicker(givenAsset), toTicker(givenUnit || defaultUnit)];
    // If we have an exact match then skip the generalized pathfinder logic
    const exact = json.find(p => p.time === time && (
      (p.asset === asset && p.unit === unit) || (p.asset === unit && p.unit === asset)
    ));
    if (exact?.price) return exact.asset === asset ? exact.price : 1/exact.price;
    log.debug(`Getting ${unit} price of ${asset} on date closest to ${time}..`);
    const path = findPath(json, time, asset, unit, limit, log);
    if (!path.length) {
      log.debug(`No path is available between ${unit} and ${asset} on ${time}..`);
      return undefined;
    }
    log.debug(path, `Got path from ${unit} to ${asset} on ${time}..`);
    const price = sumPath(path, time);
    // Maybe cache this price if we had to calculate it
    // Cache prices that are older than 24hrs bc it's prob the date of a taxable event, etc
    // Current prices are unlikely to be needed again tomorrow, don't cache these
    if ((path.length > 1 || path[0].prices.length > 1) && time < Date.now() - msPerDay) {
      setPrice({
        time,
        unit,
        asset,
        price,
        source: path.reduce((src, step) => {
          return `${src}+${step.prices.map(s => s?.source || "").join("+")}`;
        }, "").replace(/^\++/, "").replace(/\++$/ , "").replace(/\++/, "+"),
      });
    }
    return price;
  };

  // Returns exact timestamps that are missing rather than interpolation requirements
  const getMissing = (vm: ValueMachine, givenUnit?: Asset): MissingPrices => {
    const unit = toTicker(givenUnit || defaultUnit);
    const missing = getRequiredPrices(vm, unit);
    for (const asset of Object.keys(missing)) {
      for (const date of missing[asset]) {
        // if we have sufficient data to accurately infer this price across <24 hrs then remove it
        if (getPrice(toTime(date), asset, unit, msPerDay + 1)) {
          missing[asset].splice(missing[asset].findIndex(d => d === date), 1);
        }
      }
    }
    return missing;
  };

  const calcPrices = (vm: ValueMachine): PriceJson => {
    const newPrices = [] as PriceJson;
    vm.json.events.filter(evt => evt.type === EventTypes.Trade).forEach(evt => {
      const trade = vm.getEvent(evt.index) as HydratedTradeEvent;
      const time = toTime(trade.date);
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
          time,
          unit: outAssets[0],
          asset: inAssets[0],
          price: parseFloat(math.div(output[outAssets[0]], input[inAssets[0]])),
          source,
        });
      // Assumes that for 2 inputs => 1 output,
      // - the 2 inputs have equal value
      // - the total input has value equal to the output
      } else if (inAssets.length === 2 && outAssets.length === 1) {
        // Get prices of the two inputs relative to each other
        newPrices.push({
          time,
          unit: inAssets[0],
          asset: inAssets[1],
          price: parseFloat(math.div(input[inAssets[0]], input[inAssets[1]])),
          source,
        });
        // Get prices of the output relative to each input
        newPrices.push({
          time,
          unit: inAssets[0],
          asset: outAssets[0],
          price: parseFloat(math.div(math.mul(input[inAssets[0]], "2"), output[outAssets[0]])),
          source,
        });
      // Assumes that for 1 input => 2 outputs,
      // - the 2 outputs have equal value
      // - the input has value equal to the total output
      } else if (outAssets.length === 2 && inAssets.length === 1) {
        // Get prices of the two outputs relative to each other
        newPrices.push({
          time,
          unit: outAssets[0],
          asset: outAssets[1],
          price: parseFloat(math.div(output[outAssets[0]], output[outAssets[1]])),
          source,
        });
        // Get prices of the input relative to each output
        newPrices.push({
          time,
          unit: outAssets[0],
          asset: inAssets[0],
          price: parseFloat(math.div(math.mul(output[outAssets[0]], "2"), input[inAssets[0]])),
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
    return newPrices;
  };

  const fetchPrices = async (
    missingPrices: MissingPrices,
    givenUnit?: Asset,
  ): Promise<PriceJson> => {
    const unit = toTicker(givenUnit || defaultUnit);
    const newPrices = [] as PriceJson;
    // To fetch from coingecko or covalent:
    // convert missing time prices into the day prices required to infer accurately
    const toFetch = {} as MissingPrices;
    for (const asset of Object.keys(missingPrices)) {
      for (const date of missingPrices[asset]) {
        toFetch[asset] = toFetch[asset] || [];
        toFetch[asset].push(toDay(date), toNextDay(date));
      }
    }
    // Remove duplicates & sort
    for (const asset of Object.keys(toFetch)) {
      toFetch[asset] = dedup(toFetch[asset]).sort();
      log.debug(`Fetching ${toFetch[asset].length} ${unit} prices of ${asset}`);
      for (const day of toFetch[asset]) {
        const newEntries = await getCoinGeckoEntries(json, day, asset, unit, setPrice, log);
        merge(newEntries);
        newPrices.push(...newEntries);
      }
    }
    log.info(`Fetched ${newPrices.length} new ${unit} prices`);
    return newPrices;
  };

  const getJson = (): PriceJson => {
    return [...json];
  };

  return {
    calcPrices,
    fetchPrices,
    getJson,
    getMissing,
    getPrice,
    merge,
  };
};
