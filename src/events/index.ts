import {
  Asset,
  AssetType,
  ChainData,
  Event,
  FinancialData,
  Forms,
  InputData,
  TaxableTrade,
} from "../types";
import { add, eq, gt, lt, mul, round, sub } from "../utils";

import { parseEthTxFactory } from "./parseEthTx";
import { fetchChainData } from "./fetchChainData";
import { formatCoinbase } from "./coinbase";
import { formatWyre } from "./wyre";

export const getFinancialData = async (input: InputData): Promise<FinancialData> => {

  const events: Event[] = [];

  for (const event of input.events || []) {
    if (typeof event === "string" && event.endsWith(".csv")) {
      if (event.toLowerCase().includes("coinbase")) {
        events.push(...formatCoinbase(event));
      } else if (event.toLowerCase().includes("wyre")) {
        events.push(...formatWyre(event));
      } else {
        throw new Error(`I don't know how to parse events from ${event}`);
      }
    } else if (typeof event !== "string" && event.date) {
      events.push(event as Event);
    } else {
      throw new Error(`I don't know how to parse event: ${JSON.stringify(event)}`);
    }
  }

  const chainData = await fetchChainData(input.ethAddresses.map(a => a.toLowerCase()), input.etherscanKey);
  const parseEthTx = parseEthTxFactory(input);

  events.concat(
    ...Object.values(chainData.transactions).map(parseEthTx).filter(e => !!e),
  );

  return {
    expenses: [],
    income: [],
    trades: [], // getTaxableTrades(input, events),
  };
};

const stringifyAssets = (assets) => {
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

export const getTaxableTrades = (input: InputData, events: Event[]): TaxableTrade[] => {
  const debugMode = input.logLevel > 3;
  const assets: { [key: string]: Asset[] } = {};
  const startingAssets: { [key: string]: Asset[] } = {};
  const trades = [];
  let totalCost = "0";
  let totalProceeds = "0";
  let totalProfit = "0";

  for (const event of events) {
    // if event.category === "init" then startingAssets.push()
    const { assetsIn, assetsOut, date, from, to } = event;
    if (!date.startsWith(input.taxYear.substring(2))) {
      debugMode && console.log(`Skipping old trade from ${date}`);
      continue;
    }

    if (assetsIn && assetsIn.length && assetsIn.length > 0) {
      for (const asset of assetsIn) {

        (from || "").substring(0, 2) === "ex"
          ? (debugMode && console.log(`Bought ${asset.amount} ${asset.type} from ${from}`))
          : (debugMode && console.log(`Received ${asset.amount} ${asset.type} from ${from}`));

        if (!assets[asset.type]) {
          debugMode && console.log(`Creating new asset category for ${event.category}`);
          assets[asset.type] = [];
        }

        assets[asset.type].push({
          amount: asset.amount,
          date: event.date,
          price: asset.price,
          type: asset.type,
        });

      }
    }

    if (assetsOut && assetsOut.length && assetsOut.length > 0) {
      for (const asset of assetsOut) {
        (to || "").substring(0, 2) === "ex"
          ? (debugMode && console.log(`Sold ${asset.amount} ${asset.type} to ${to}`))
          : (debugMode && console.log(`Sent ${asset.amount} ${asset.type} to ${to}`));

        if (!assets[asset.type]) {
          debugMode && console.log(`Creating new ${asset.type} asset category for ${event.category}`);
          assets[asset.type] = [];
        }

        let amt = asset.amount;
        let cost = "0";
        let profit = "0";

        while (true) {
          if (eq(amt, "0") || lt(amt, "0")) {
            break;
          }
          const chunk = assets[asset.type].pop();
          if (!chunk) {
            console.warn(`Attempting to sell more ${asset.type} than we bought. ${asset.type} left: ${JSON.stringify(assets[asset.type])}`);
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
            assets[asset.type].unshift(chunk);
            break;
          } else {
            profit = add([profit, mul(sub(chunk.price, chunk.price), chunk.amount)]);
            cost = add([cost, mul(chunk.price, chunk.amount)]);
            amt = sub(amt, chunk.amount);
          }
        }
        const proceeds = mul(asset.price, asset.amount);

        trades.push({
          Adjustment: "",
          Code: "",
          Cost: cost,
          DateAcquired: "VARIOUS",
          DateSold: `${date.substring(2,4)}/${date.substring(4,6)}/${date.substring(0,2)}`,
          Description: `${round(asset.amount)} ${asset.type}`,
          GainOrLoss: profit,
          Proceeds: proceeds,
        });

        totalProceeds = add([totalProceeds, proceeds]);
        totalCost = add([totalCost, cost]);
        totalProfit = add([totalProfit, profit]);

      }
    }

  }

  ////////////////////////////////////////
  // Print Results

  console.log(`Starting Assets: ${startingAssets}`); 
  for (const trade of trades) {
    console.log(`Sold ${trade.Description} on ${trade.DateSold} for ${trade.Proceeds} (Purchased for ${trade.Cost} = profit of ${trade.GainOrLoss}`);
  }
  console.log(`Assets Leftover: ${stringifyAssets(assets)}`); 
  console.log(`Total proceeds: ${totalProceeds} - cost ${totalCost} = profit ${totalProfit}`); 

  return trades;
};