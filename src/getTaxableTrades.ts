import { add, eq, gt, lt, mul, round, sub, } from '../utils';
import { InputData, FinancialData, Forms, Event } from '../types';

const stringifyAssets = (assets) => {
  let output = '[\n'
  for (const [key, value] of Object.entries(assets)) {
    let total = "0"
    output += `  ${key}:`
    for (const chunk of value as any) {
      output += ` ${chunk.quantity}@${chunk.price},`
      total = add([total, chunk.quantity])
    }
    output += ` (Total: ${total})\n`
  }
  return `${output}]`
}

export const getTaxableTrades = (input: InputData) => {

  const assets = {};
  const startingAssets = stringifyAssets(assets);
  const trades = []
  let totalCost = "0"
  let totalProceeds = "0"
  let totalProfit = "0"

  for (const tx of txHistory) {
    if (!tx.date.startsWith(finances.input.taxYear.substring(2))) {
      debugMode && console.log(`Skipping old trade from ${tx.date}`);
      continue
    }

    for (const input of tx.assetsIn) {

      tx.from.substring(0, 2) === "ex"
        ? (debugMode && console.log(`Bought ${input.amount} ${input.type} from ${tx.from}`))
        : (debugMode && console.log(`Received ${input.amount} ${input.type} from ${tx.from}`))

      if (!assets[input.type]) {
        debugMode && console.log(`Creating new asset category for ${tx.type}`);
        assets[input.type] = [];
      }

      assets[tx.type].push({
        quantity: tx.quantity,
        price: tx.price,
      });

    }

    for (const output of tx.assetsOut) {
      tx.to.substring(0, 2) === "ex"
        ? (debugMode && console.log(`Sold ${tx.quantity} ${tx.asset} to ${tx.to}`))
        : (debugMode && console.log(`Sent ${tx.quantity} ${tx.asset} to ${tx.to}`))


      let amt = tx.quantity
      let cost = "0"
      let profit = "0"

      while (true) {
        if (eq(amt, "0") || lt(amt, "0")) {
          break
        }
        const asset = assets[tx.asset].pop()
        if (!asset) {
          throw new Error(`Attempting to sell more ${tx.asset} than we bought. ${tx.asset} left: ${JSON.stringify(assets[tx.asset])}`);
        }
        if (eq(asset.quantity, amt)) {
          profit = add([profit, sub(mul(amt, tx.price), mul(amt, asset.price))]);
          cost = add([cost, mul(asset.price, amt)]);
          asset.quantity = sub(asset.quantity, amt);
          break
        } else if (gt(asset.quantity, amt)) {
          profit = add([profit, sub(mul(amt, tx.price), mul(amt, asset.price))]);
          cost = add([cost, mul(asset.price, amt)]);
          asset.quantity = sub(asset.quantity, amt);
          assets[tx.asset].unshift(asset);
          break
        } else {
          profit = add([profit, mul(sub(tx.price, asset.price), asset.quantity)]);
          cost = add([cost, mul(asset.price, asset.quantity)]);
          amt = sub(amt, asset.quantity);
        }
      }
      const proceeds = mul(tx.price, tx.quantity);

      trades.push({
        Description: `${round(tx.quantity)} ${tx.asset}`,
        DateAcquired: 'VARIOUS',
        DateSold: `${tx.date.substring(2,4)}/${tx.date.substring(4,6)}/${tx.date.substring(0,2)}`,
        Proceeds: proceeds,
        Cost: cost,
        Code: '',
        Adjustment: '',
        GainOrLoss: profit,
      });

      totalProceeds = add([totalProceeds, proceeds]);
      totalCost = add([totalCost, cost]);
      totalProfit = add([totalProfit, profit]);

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
}
