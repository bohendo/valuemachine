import {
  Asset,
  Logger,
} from "@valuemachine/types";

import { Path, PriceJson } from "./types";
import { getNearbyPrices } from "./utils";

const isInferable = (
  prices: PriceJson,
  time: number,
  asset: Asset,
  unit: Asset,
  limit?: number,
): boolean => {
  if (asset === unit) return true;
  const nearby = getNearbyPrices(prices, time, asset, unit);
  if (nearby.length === 0) return false;
  if (nearby.length === 1) return true;
  if (nearby.length === 2) {
    if (nearby[0] && nearby[1]) return true;
    if (nearby[0] && !nearby[1] && (!limit || time - nearby[0].time < limit)) return true;
    if (!nearby[0] && nearby[1] && (!limit || nearby[1].time - time < limit)) return true;
    if (!nearby[0] && !nearby[1]) return false;
  }
  return false;
};

// Given an asset, get a list of other assets that we already have exchange rates for
const getNeighbors = (prices: PriceJson, time: number, asset: Asset, limit?: number): Asset[] =>
  prices.filter(entry =>
    entry.asset === asset || entry.unit === asset
  ).reduce((neighbors, entry) => {
    const candidate = entry.asset === asset ? entry.unit : entry.asset;
    if (neighbors.includes(candidate)) return neighbors;
    if (entry.time === time) {
      return [...neighbors, candidate];
    } else {
      if (isInferable(prices, time, asset, candidate, limit)) {
        return [...neighbors, candidate];
      } else {
        return neighbors;
      }
    }
  }, [] as Asset[]);

const getDistance = (path: Path, time: number): number => path.reduce((distance, step) => {
  if (step.prices.length === 2) {
    if (step.prices[0] && step.prices[1]) {
      return distance + Math.abs(step.prices[1].time - step.prices[0].time);
    } else if (step.prices[0] && !step.prices[1]) {
      return distance + Math.abs(time - step.prices[0].time);
    } else if (!step.prices[0] && step.prices[1]) {
      return distance + Math.abs(step.prices[1].time - time);
    }
  }
  return distance;
}, 0);

export const findPath = (
  prices: PriceJson,
  time: number,
  start: Asset,
  end: Asset,
  limit?: number,
  log?: Logger,
): Path => {
  const startTime = Date.now();
  log.debug(`Searching for path from ${start} to ${end} on ${time}`);

  const unvisited = new Set(
    prices.reduce((out, entry) => ([...out, entry.asset, entry.unit]), [] as Asset[])
  );

  if (!unvisited.has(start) || !unvisited.has(end)) {
    log?.debug(`${end} to ${start} exchange rate is unavailable on ${time}`);
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
    const neighbors = getNeighbors(prices, time, current, limit).filter(
      node => unvisited.has(node)
    );
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
        prices: getNearbyPrices(prices, time, neighbor, current),
      }]);
      const newDistance = getDistance(newPathToNeighbor, time);
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

  log?.trace(distances, `Final distances from ${start} to ${end}`);
  log?.debug(`Found a path on ${time} in ${Date.now() - startTime}ms: ${
    pathToCurrent.map(step => step.asset).join(" -> ")
  }`);
  return pathToCurrent;
};
