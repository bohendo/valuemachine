import {
  Asset,
  Event,
  InputData,
  CapitalGain,
} from "./types";
import { add, eq, gt, Logger, lt, mul, round, sub } from "./utils";
import { fetchPrice } from "./fetchPrice";

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

const getPrice = async (input: InputData, asset: string, date: string): Promise<string> =>
  ["USD", "DAI", "SAI"].includes(asset)
    ? "1"
    : ["ETH", "WETH"].includes(asset)
      ? await fetchPrice(input, "ETH", date)
      : await fetchPrice(input, asset, date);

export const getCapitalGains = async (
  input: InputData,
  events: Event[],
): Promise<CapitalGain[]> => {
  const log = new Logger("CapitalGains", input.logLevel);
  const assets: { [app: string]: { [type: string]: Asset[] }} = { self: {} };
  const trades = [];
  const total = { cost: {}, proceeds: {}, profit: {} };

  log.info(`Parsing ${events.length} events for taxable trades..`);

  // TODO: what if input.capitalGainsMethod is LIFO or HIFO?
  const getNext = (type: string): Asset => assets.self[type] ? assets.self[type].pop() : undefined;
  const putBack = (type: string, asset: Asset): number => assets.self[type].unshift(asset);

  let eventIndex = 1;
  for (const event of events.sort(
    (e1, e2) => new Date(e1.date).getTime() - new Date(e2.date).getTime(),
  )) {
    const date = event.date;

    // if (event.description.includes("WETH")) { log.setLevel(5); } else { log.setLevel(3); }

    log.info(`Processing event #${eventIndex} on ${date.split("T")[0]}: ${event.description || JSON.stringify(event)}`);
    eventIndex += 1;
    // log.debug(`Processing event: ${JSON.stringify(event)}`);

    for (const asset of event.assetsIn) {
      const app = event.category === "withdrawal" ? event.from : "self";
      if (!assets[app]) {
        log.debug(`Creating new asset app for ${app}`);
        assets[app] = {};
      }
      if (!assets[app][asset.type]) {
        log.debug(`Creating new asset category for ${app}: ${asset.type}`);
        assets[app][asset.type] = [];
      }

      if (app !== "self") {

        // eslint-disable-next-line no-constant-condition
        let toWithdraw = asset.amount;
        while (gt(toWithdraw, "0")) {
          const chunk = assets[app][asset.type].pop();
          if (!chunk) {
            // TODO: identify exchanges or calculate interest gained
            if (!assets.self[asset.type]) {
              assets.self[asset.type] = [];
            }
            assets.self[asset.type].push({
              amount: toWithdraw,
              date,
              price: event.prices[asset.type] || await getPrice(input, asset.type, date),
              type: asset.type,
            });
            log.warn(`Withdrew ${toWithdraw} more ${asset.type} from ${app} than we've deposited`);
            toWithdraw = "0";
          } else if (eq(chunk.amount, toWithdraw)) {
            assets.self[asset.type].push(chunk);
            toWithdraw = sub(toWithdraw, chunk.amount);
            log.debug(`Withdrew chunk of ${chunk.amount} ${chunk.type} from ${app} (done)`);
          } else if (gt(chunk.amount, toWithdraw)) {
            const chunkLeft = sub(chunk.amount, toWithdraw);
            assets.self[asset.type].push({
              amount: sub(chunk.amount, chunkLeft),
              ...chunk,
            });
            assets[app][asset.type].unshift({
              amount: chunkLeft,
              ...chunk,
            });
            toWithdraw = sub(toWithdraw, chunk.amount);
            log.debug(`Withdrew partial chunk of ${chunk.amount} ${chunk.type} from ${app}`);
          } else if (lt(chunk.amount, toWithdraw)) {
            assets.self[asset.type].push(chunk);
            toWithdraw = sub(toWithdraw, chunk.amount);
            log.debug(`Withdrew chunk of ${chunk.amount} ${chunk.type} from ${app} (cont)`);
          }
        }

      } else {

        assets[app][asset.type].push({
          amount: asset.amount,
          date,
          price: event.prices[asset.type] || await getPrice(input, asset.type, date),
          type: asset.type,
        });

      }
    }

    for (const asset of event.assetsOut) {
      const app = event.category === "deposit" ? event.to : "self";
      if (!assets[app]) {
        log.debug(`Creating new asset app for ${app}`);
        assets[app] = {};
      }
      if (!assets[app][asset.type]) {
        log.debug(`Creating new asset category for ${app}: ${asset.type}`);
        assets[app][asset.type] = [];
      }

      // Deposit this asset into defi app
      if (app !== "self") {

        // eslint-disable-next-line no-constant-condition
        let toDeposit = asset.amount;
        while (gt(toDeposit, "0")) {
          const chunk = getNext(asset.type);
          if (!chunk) {
            throw new Error(`Failed to deposit ${asset.type} into ${app} bc we don't have enough.`);
          }
          if (eq(chunk.amount, toDeposit)) {
            assets[app][asset.type].push(chunk);
            toDeposit = sub(toDeposit, chunk.amount);
            log.debug(`Deposited chunk of ${chunk.amount} ${chunk.type} into ${app} (done)`);
          } else if (gt(chunk.amount, toDeposit)) {
            const chunkLeft = sub(chunk.amount, toDeposit);
            assets[app][asset.type].push({
              amount: sub(chunk.amount, chunkLeft),
              ...chunk,
            });
            toDeposit = sub(toDeposit, chunk.amount);
            assets.self[asset.type].unshift({
              amount: chunkLeft,
              ...chunk,
            });
            log.debug(`Deposited partial chunk of ${chunk.amount} ${chunk.type} into ${app}`);
          } else if (lt(chunk.amount, toDeposit)) {
            assets[app][asset.type].push(chunk);
            toDeposit = sub(toDeposit, chunk.amount);
            log.debug(`Deposited chunk of ${chunk.amount} ${chunk.type} into ${app} (cont)`);
          }
        }

      } else {

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
            throw new Error(`Selling more ${asset.type} than we have`);
            break;
          }

          const price = event.prices[asset.type] || await getPrice(input, asset.type, date);
          if (!price) {
            throw new Error(`Chunk is missing a price: ${JSON.stringify(chunk, null, 2)}`);
          }

          if (eq(chunk.amount, amt)) {
            profit = add([profit, mul(amt, sub(price, chunk.price))]);
            cost = add([cost, mul(chunk.price, amt)]);
            chunk.amount = sub(chunk.amount, amt);
            log.debug(`Sold chunk of ${chunk.amount} ${chunk.type} for profit of ${profit} (done)`);
            break;
          } else if (gt(chunk.amount, amt)) {
            profit = add([profit, mul(amt, sub(price, chunk.price))]);
            cost = add([cost, mul(chunk.price, amt)]);
            chunk.amount = sub(chunk.amount, amt);
            putBack(asset.type, chunk);
            log.debug(`Sold partial chunk of ${chunk.amount} ${chunk.type} for profit of ${profit}`);
            break;
          } else {
            profit = add([profit, mul(chunk.amount, sub(price, chunk.price))]);
            cost = add([cost, mul(chunk.price, chunk.amount)]);
            amt = sub(amt, chunk.amount);
            log.debug(`Sold chunk of ${chunk.amount} ${chunk.type} for profit of ${profit} (cont)`);
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
  }

  ////////////////////////////////////////
  // Print Results

  const totalCost =
    Object.keys(total.cost).reduce((cur, acc) => add([acc, total.cost[cur]]), "0");
  const totalProceeds =
    Object.keys(total.proceeds).reduce((cur, acc) => add([acc, total.proceeds[cur]]), "0");
  const totalProfit =
    Object.keys(total.profit).reduce((cur, acc) => add([acc, total.profit[cur]]), "0");

  for (const trade of trades) {
    log.info(`Sold ${trade.Description} on ${trade.DateSold} for ${trade.Proceeds} (Purchased for ${trade.Cost} = profit of ${trade.GainOrLoss}`);
  }
  log.info(`Assets Leftover: ${stringifyAssets(assets.self)}`);
  log.info(`Total proceeds: ${totalProceeds} - cost ${totalCost} = profit ${totalProfit}`);

  return trades;
};
