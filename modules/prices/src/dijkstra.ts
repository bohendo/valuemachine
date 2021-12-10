import {
  Asset,
  Logger,
  DateTimeString,
} from "@valuemachine/types";
import {
  dedup,
} from "@valuemachine/utils";

import {
  PriceJson,
} from "./types";

// Given an asset, get a list of other assets that we already have exchange rates for
const getNeighbors = (prices: PriceJson, date: DateTimeString, asset: Asset): Asset[] =>
  dedup(prices.map(entry => {
    if (entry.date !== date) return null;
    else if (entry.asset === asset) return entry.unit;
    else if (entry.unit === asset) return entry.asset;
    else return null;
  }).filter(a => !!a));

export const findPath = (
  prices: PriceJson,
  date: DateTimeString,
  start: Asset,
  target: Asset,
  log?: Logger,
): Asset[] => {
  const unvisited = new Set(
    prices.filter(entry => entry.date === date).reduce((out, entry) => {
      return [...out, entry.asset, entry.unit];
    }, [] as Asset[])
  );
  const countPrices = (date: DateTimeString, asset?: Asset): number =>
    prices.filter(entry => entry.date === date).reduce((count, entry) => {
      if (!asset || entry.unit === asset || entry.asset === asset) return count + 1;
      else return count;
    }, 0);
  if (
    !unvisited.has(start) || !unvisited.has(target) ||
    !countPrices(date, start) || !countPrices(date, target)
  ) {
    log?.trace(`${target} to ${start} exchange rate is unavailable on ${date}`);
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
    const neighbors = getNeighbors(prices, date, current).filter(node => unvisited.has(node));
    log?.debug(`Checking unvisited neighbors of ${current}: ${neighbors.join(", ")}`);
    let closest;
    if (!branches.includes(current) && neighbors.length > 1) {
      branches.push(current);
      log?.debug(`New branch set at ${current}`);
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
          log?.debug(`No exchange-rate-path exists between ${start} and ${target}`);
          log?.debug(prices.filter(entry => entry.date === date), `Prices we have so far`);
          log?.debug(distances, `Final distances from ${start} to ${target}`);
          return [];
        } else {
          // Return to the start?
          current = branches.pop();
          log?.debug(`Returning to prev branch at ${current}`);
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
  log?.info(`Found a path from ${start} to ${target}: ${pathToCurrent.join(", ")}`);
  log?.debug(distances, `Final distances from ${start} to ${target}`);
  return pathToCurrent;
};
