import {
  Asset,
  Logger,
  DateTimeString,
} from "@valuemachine/types";
import {
  dedup,
  math,
  msDiff,
} from "@valuemachine/utils";

import { Path, PriceJson } from "./types";
import { getNearbyPrices } from "./utils";

const isInterpolable = (prices: PriceJson, date, asset, unit): boolean => {
  if (asset === unit) return true;
  const nearby = getNearbyPrices(prices, date, asset, unit);
  if (nearby.length === 1 || (nearby.length === 2 && nearby[0] && nearby[1])) {
    return true;
  }
  return false;
};

// Given an asset, get a list of other assets that we already have exchange rates for
const getNeighbors = (prices: PriceJson, date: DateTimeString, asset: Asset): Asset[] =>
  dedup(prices.filter(entry =>
    entry.asset === asset || entry.unit === asset
  ).map(entry => {
    const candidate = entry.asset === asset ? entry.unit : entry.asset;
    if (entry.date === date) {
      return candidate;
    } else {
      if (isInterpolable(prices, date, asset, candidate)) {
        return candidate;
      } else {
        return null;
      }
    }
  }).filter(a => !!a));

const getDistance = (path: Path): number => path.reduce((distance, step) => {
  if (step.prices.length === 2) return parseInt(math.round(math.add(
    distance.toString(),
    msDiff(step.prices[0].date, step.prices[1].date).toString(),
  ), 0));
  else return distance;
}, 0);

export const findPath = (
  prices: PriceJson,
  date: DateTimeString,
  start: Asset,
  end: Asset,
  log?: Logger,
): Path => {

  const unvisited = new Set(
    prices
      .reduce((out, entry) => ([...out, entry.asset, entry.unit]), [] as Asset[])
      .filter(asset =>
        isInterpolable(prices, date, asset, start) || isInterpolable(prices, date, asset, end) 
      )
  );

  log?.debug(`Unvisited assets: ${Array.from(unvisited).join(", ")}`);

  if (!unvisited.has(start) || !unvisited.has(end)) {
    log?.debug(`${end} to ${start} exchange rate is unavailable on ${date}`);
    return [];
  }

  // Initialize all distances to infinity
  const distances = {} as { [to: string]: { distance: number; path: Path; } };
  for (const val of unvisited.values() as IterableIterator<Asset>) {
    distances[val] = {
      distance: val === start ? 0 : Infinity,
      path: [{
        asset: start,
        prices: [],
      }],
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
      log?.debug(`New branch flagged: ${current}`);
    }

    for (const neighbor of neighbors) {
      const oldDistance = distances[neighbor].distance;
      const oldPathToNeighbor = distances[neighbor].path;
      const newPathToNeighbor = pathToCurrent.concat([{
        asset: neighbor,
        prices: getNearbyPrices(prices, date, neighbor, current),
      }]);
      const newDistance = getDistance(newPathToNeighbor);
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
      if (distances[end]?.distance < Infinity) {
        pathToCurrent = distances[end].path;
        break; // Done!
      } else {
        // Are there any other unvisited nodes to check?
        if (!branches.length || unvisited.size === 0) {
          log?.debug(`No exchange-rate-path exists between ${start} and ${end}`);
          log?.debug(distances, `Final distances from ${start} to ${end}`);
          return [];
        } else {
          // Return to the start?
          current = branches.pop();
          log?.debug(`Returning to prev branch at ${current}`);
          pathToCurrent = distances[current].path;
        }
      }
    } else if (closest === end) {
      pathToCurrent = distances[closest].path;
      break; // Done!
    } else {
      current = closest;
      pathToCurrent = distances[current].path;
    }
  }

  log?.debug(`Found a path: ${pathToCurrent.map(step => step.asset).join(" -> ")}`);
  log?.trace(distances, `Final distances from ${start} to ${end}`);
  return pathToCurrent;
};
