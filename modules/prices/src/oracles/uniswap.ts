import {
  Assets,
  publicAddresses,
} from "@valuemachine/transactions";
import {
  Asset,
  DateTimeString,
  Logger,
} from "@valuemachine/types";
import {
  math,
} from "@valuemachine/utils";
import axios from "axios";

import {
  formatUnit,
  retry,
} from "../utils";

const fetchUniswapV1Price = async (
  date: DateTimeString,
  asset: Asset,
  log?: Logger,
): Promise<string | undefined> => {
  if (asset === Assets.ETH) return "1";
  const assetId = publicAddresses.find(market =>
    market.name.startsWith("UniV1-") && market.name.endsWith(asset)
  )?.address;
  if (!assetId) {
    log?.warn(`Asset ${asset} is not available on UniswapV1`);
    return undefined;
  }
  log?.info(`Fetching ETH price of ${asset} on ${date} from UniswapV1 market ${assetId}`);
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
    const response = await retry(attempt, log);
    price = response?.exchangeHistoricalDatas?.[0]?.price;
  } catch (e) {
    log?.error(e.message);
  }
  if (!price || math.eq(price, "0")) {
    log?.warn(`Could not fetch ${asset} price from UniswapV1 on ${date}`);
    return undefined;
  }
  return math.div("1", price);
};

const fetchUniswapV2Price = async (
  date: DateTimeString,
  asset: Asset,
  unit: Asset,
  log?: Logger,
): Promise<string | undefined> => {
  const pairId = publicAddresses.find(market =>
    market.name.startsWith(`UniV2-`) &&
    (market.name.includes(`-${asset}-`) || market.name.endsWith(`-${asset}`)) &&
    (market.name.includes(`-${unit}-`) || market.name.endsWith(`-${unit}`))
  )?.address;
  if (!pairId) {
    log?.warn(`Asset pair ${asset}-${unit} is not available on UniswapV2`);
    return undefined;
  }
  log?.info(`Fetching ${unit} price of ${asset} on ${date} from UniswapV2 market ${pairId}`);
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
    const response = await retry(attempt, log);
    log?.debug(response, "Got uniswap v2 response");
    price = response?.exchangeHistoricalDatas?.[0]?.price;
  } catch (e) {
    log?.error(e.message);
  }
  if (!price || math.eq(price, "0")) {
    log?.warn(`Could not fetch ${asset} price from UniswapV2 on ${date}`);
    return undefined;
  }
  return math.div("1", price);
};

// Aggregator for all versions of uniswap
export const fetchUniswapPrice = async (
  date: DateTimeString,
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
    if (unit === Assets.ETH) {
      return await fetchUniswapV1Price(date, asset);
    } else {
      return undefined;
    }
  } else if (time < uniV3Launch) {
    if (unit === Assets.ETH) {
      return await fetchUniswapV1Price(date, asset)
        || await fetchUniswapV2Price(date, asset, Assets.ETH);
    } else {
      return await fetchUniswapV2Price(date, asset, unit);
    }
  }
  // All uniswap versions are available
  // Use the one with best liquidity?
  // Or should we average all available prices?
  // Or use a liquidity-weighted average?! Fancy
  if (unit === Assets.ETH) {
    return await fetchUniswapV1Price(date, asset)
      || await fetchUniswapV2Price(date, asset, Assets.ETH);
    //|| await getUniswapV3Price(date, asset, Assets.ETH);
  } else {
    return await fetchUniswapV2Price(date, asset, unit);
    //|| await getUniswapV3Price(date, asset, Assets.ETH);
  }
};

