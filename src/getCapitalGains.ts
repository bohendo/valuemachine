import {
  Asset,
  Event,
  InputData,
  TaxableTrade,
} from "./types";
import { add, eq, gt, Logger, lt, mul, round, sub } from "./utils";

const stringifyAssets = (assets): string => {
  let output = "[\n";
  for (const [key, value] of Object.entries(assets)) {
    let total = "0";
    output += `  ${key}:`;
    for (const chunk of value as any) {
      output += ` ${chunk.amount}@${chunk.price},`;
      total = add([total, chunk.amount]);
    }
    output += ` (Total: ${total})\n`;
  }
  return `${output}]`;
};

export const getCapitalGains = (input: InputData, events: Event[]): TaxableTrade[] => {
  const log = new Logger("CapitalGains", input.logLevel);
  const assets: { [key: string]: Asset[] } = {};
  const startingAssets: { [key: string]: Asset[] } = {};
  const trades = [];
  const total = { cost: {}, proceeds: {}, profit: {} };

  log.info(`Parsing ${events.length} events for taxable trades..`);

  // TODO: what if input.capitalGainsMethod is LIFO or HIFO?
  const getNext = (type: string): Asset => assets[type].pop();
  const putBack = (type: string, asset: Asset): number => assets[type].unshift(asset);

  for (const event of events.sort(
    (e1, e2) => new Date(e1.date).getTime() - new Date(e2.date).getTime(),
  )) {
    const date = event.date;

    log.debug(`Processing event: ${JSON.stringify(event)}`);
    log.info(`Processing event: ${event.description || JSON.stringify(event)}`);

    for (const asset of event.assetsIn) {
      if (!assets[asset.type]) {
        log.info(`Creating new asset category for ${asset.type}`);
        assets[asset.type] = [];
      }
      assets[asset.type].push({
        amount: asset.amount,
        date,
        price: event.prices[asset.type],
        type: asset.type,
      });
    }

    for (const asset of event.assetsOut) {

      if (!assets[asset.type]) {
        log.info(`Creating new asset category for ${asset.type}`);
        assets[asset.type] = [];
      }

      let amt = asset.amount;
      let cost = "0";
      let profit = "0";
      let proceeds = "0";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (eq(amt, "0") || lt(amt, "0")) {
          break;
        }
        const chunk = getNext(asset.type);
        if (!chunk) {
          throw new Error(`Attempting to sell more ${asset.type} than we bought.`);
          break;
        }
        if (eq(chunk.amount, amt)) {
          profit = add([profit, sub(mul(amt, chunk.price), mul(amt, chunk.price))]);
          cost = add([cost, mul(chunk.price, amt)]);
          chunk.amount = sub(chunk.amount, amt);
          break;
        } else if (gt(chunk.amount, amt)) {
          profit = add([profit, sub(mul(amt, chunk.price), mul(amt, chunk.price))]);
          cost = add([cost, mul(chunk.price, amt)]);
          chunk.amount = sub(chunk.amount, amt);
          putBack(asset.type, chunk);
          break;
        } else {
          profit = add([profit, mul(sub(chunk.price, chunk.price), chunk.amount)]);
          cost = add([cost, mul(chunk.price, chunk.amount)]);
          amt = sub(amt, chunk.amount);
        }
      }
      proceeds = mul(asset.price, asset.amount);

      trades.push({
        Adjustment: "",
        Code: "",
        Cost: cost,
        DateAcquired: "VARIOUS",
        // DateSold: month/day/year
        DateSold: `${date.substring(5,7)}/${date.substring(8,10)}/${date.substring(2,4)}`,
        Description: `${round(asset.amount)} ${asset.type}`,
        GainOrLoss: profit,
        Proceeds: proceeds,
      });

      total.proceeds[asset.type] = add([total.proceeds[asset.type], proceeds]);
      total.cost[asset.type] = add([total.cost[asset.type], cost]);
      total.profit[asset.type] = add([total.profit[asset.type], profit]);

    }

  }

  ////////////////////////////////////////
  // Print Results

  const totalCost =
    Object.keys(total.cost).reduce((cur, acc) => add([acc, total.cost[cur]]), "0");
  const totalProceeds =
    Object.keys(total.proceeds).reduce((cur, acc) => add([acc, total.proceeds[cur]]), "0");
  const totalProfit =
    Object.keys(total.profit).reduce((cur, acc) => add([acc, total.profit[cur]]), "0");

  log.info(`Starting Assets: ${startingAssets}`); 
  for (const trade of trades) {
    log.info(`Sold ${trade.Description} on ${trade.DateSold} for ${trade.Proceeds} (Purchased for ${trade.Cost} = profit of ${trade.GainOrLoss}`);
  }
  log.info(`Assets Leftover: ${stringifyAssets(assets)}`); 
  log.info(`Total proceeds: ${totalProceeds} - cost ${totalCost} = profit ${totalProfit}`); 

  return trades;
};
