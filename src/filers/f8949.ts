import { add, eq, gt, lt, mul, parseHistory, round, sub, } from '../utils';
import { InputData, Forms, TaxableTx } from '../types';

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

export const f8949 = (input: InputData, oldForms: Forms): Forms  => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const f8949 = forms.f8949 && forms.f8949[0] ? forms.f8949[0] : {};

  const txHistory = parseHistory(input) as TaxableTx[];
  const debugMode = !!input.debugLogs

  // Set values constant across all f8949 forms
  f8949.f1_1 = `${input.FirstName} ${input.MiddleInitial} ${input.LastName}`;
  f8949.f1_2 = input.SocialSecurityNumber;
  f8949.f2_1 = f8949.f1_1;
  f8949.f2_2 = f8949.f1_2;

  const assets = input.assets || {};
  const startingAssets = stringifyAssets(assets);
  const trades = []
  let totalCost = "0"
  let totalProceeds = "0"
  let totalProfit = "0"

  debugMode && console.log(`Assets: ${stringifyAssets(assets)}`);

  for (const tx of txHistory) {
    if (!tx.timestamp.startsWith(input.taxYear.substring(2))) {
      debugMode && console.log(`Skipping old trade from ${tx.timestamp}`);
      continue
    }
    if (eq(tx.quantity, "0")) {
      debugMode && console.log(`Skipping zero-value trade of ${tx.asset} from ${tx.from} to ${tx.to}`);
      continue
    }

    if (tx.from.substring(0, 4) !== "self") {
      tx.from.substring(0, 2) === "ex"
        ? (debugMode && console.log(`Bought ${tx.quantity} ${tx.asset} from ${tx.from}`))
        : (debugMode && console.log(`Received ${tx.quantity} ${tx.asset} from ${tx.from}`))

      if (!assets[tx.asset]) {
        debugMode && console.log(`Creating new asset category for ${tx.asset}`);
        assets[tx.asset] = [];
      }

      assets[tx.asset].push({
        quantity: tx.quantity,
        price: tx.price,
      });

    } else if (tx.to.substring(0, 4) !== "self") {
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
        Description: `${round(tx.quantity, 2)} ${tx.asset}`,
        DateAcquired: 'VARIOUS',
        DateSold: `${tx.timestamp.substring(2,4)}/${tx.timestamp.substring(4,6)}/${tx.timestamp.substring(0,2)}`,
        Proceeds: proceeds,
        Cost: cost,
        Code: '',
        Adjustment: '',
        GainOrLoss: profit,
      });

      totalProceeds = add([totalProceeds, proceeds]);
      totalCost = add([totalCost, cost]);
      totalProfit = add([totalProfit, profit]);

    } else {
      console.log(`idk what to do w tx of ${tx.quantity} ${tx.asset} from ${tx.from} to ${tx.to}`);
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

  ////////////////////////////////////////
  // Format results into forms

  const buildF8949 = (fourteenTrades) => {
    const subF8949 = JSON.parse(JSON.stringify(f8949)) as any;

    // TODO: identify & properly handle long-term capital gains
    subF8949.c1_1_2 = true;

    const subTotal = { Proceeds: "0", Cost: "0", GainOrLoss: "0" }

    let i = 3;
    for (const trade of fourteenTrades) {
      subTotal.Proceeds = round(add([subTotal.Proceeds, trade.Proceeds]), 2);
      subTotal.Cost = round(add([subTotal.Cost, trade.Cost]), 2);
      subTotal.GainOrLoss = round(add([subTotal.GainOrLoss, trade.GainOrLoss]), 2);
      subF8949[`f1_${i}`] = trade.Description
      subF8949[`f1_${i+1}`] = trade.DateAcquired
      subF8949[`f1_${i+2}`] = trade.DateSold
      subF8949[`f1_${i+3}`] = round(trade.Proceeds, 2)
      subF8949[`f1_${i+4}`] = round(trade.Cost, 2)
      subF8949[`f1_${i+7}`] = round(trade.GainOrLoss, 2)
      i += 8;
    }
    subF8949.f1_115 = round(subTotal.Proceeds, 2);
    subF8949.f1_116 = round(subTotal.Cost, 2);
    subF8949.f1_119 = round(subTotal.GainOrLoss, 2);

    return subF8949;
  }

  // Build a series of forms from chunks of trades
  const chunkSize = 14;
  const tradeChunks = trades.map((e,i) =>
     i % chunkSize === 0 ? trades.slice(i, i + chunkSize) : null
  ).filter(e => !!e)

  forms.f8949 = (tradeChunks.length === 0)
    ? [buildF8949([])]
    : tradeChunks.map(buildF8949)

  return forms;
}
