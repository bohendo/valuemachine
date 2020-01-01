const f8949Mappings = require('../mappings/f8949.json');
const { add, eq, gt, lt, mul, round, sub, emptyForm, mergeForms, parseHistory } = require('../utils');

const debugMode = false;

const stringifyAssets = (assets) => {
  let output = '[\n'
  for (const [key, value] of Object.entries(assets)) {
    let total = "0"
    output += `  ${key}:`
    for (const chunk of value) {
      output += ` ${chunk.quantity}@${chunk.price},`
      total = add(total, chunk.quantity)
    }
    output += ` (Total: ${total})\n`
  }
  return `${output}]`
}

const parseF8949 = (input, output)  => {
  const f8949 = mergeForms(emptyForm(f8949Mappings), input.f8949 || {});
  const txHistory = parseHistory(input);

  // Set values constant across all f8949 forms
  f8949.FullNamePage1 = `${input.FirstName} ${input.MiddleInitial} ${input.LastName}`;
  f8949.SocialSecurityNumberPage1 = input.SocialSecurityNumber;

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


      profit = "0"
      cost = "0"

      amt = tx.quantity
      while (true) {
        if (eq(amt, "0") || lt(amt, "0")) {
          break
        }
        const asset = assets[tx.asset].pop()
        if (!asset) {
          throw new Error(`Attempting to sell more ${tx.asset} than we bought. ${tx.asset} left: ${JSON.stringify(assets[tx.asset])}`);
        }
        if (eq(asset.quantity, amt)) {
          profit = add(profit, sub(mul(amt, tx.price), mul(amt, asset.price)));
          cost = add(cost, mul(asset.price, amt));
          asset.quantity = sub(asset.quantity, amt);
          break
        } else if (gt(asset.quantity, amt)) {
          profit = add(profit, sub(mul(amt, tx.price), mul(amt, asset.price)));
          cost = add(cost, mul(asset.price, amt));
          asset.quantity = sub(asset.quantity, amt);
          assets[tx.asset].unshift(asset);
          break
        } else {
          profit = add(profit, mul(sub(tx.price, asset.price), asset.quantity));
          cost = add(cost, mul(asset.price, asset.quantity));
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

      totalProceeds = add(totalProceeds, proceeds);
      totalCost = add(totalCost, cost);
      totalProfit = add(totalProfit, profit);

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
    console.log(`building form from ${fourteenTrades.length} trades`);
    subF8949 = JSON.parse(JSON.stringify(f8949));

    // TODO: identify long-term capital gains
    subF8949.isShortTermA = false;
    subF8949.isShortTermB = false;
    subF8949.isShortTermC = true; // bc I don't have a Form 1099-B
    subF8949.isLongTermD = false;
    subF8949.isLongTermE = false;
    subF8949.isLongTermF = false;

    subTotal = { Proceeds: "0", Cost: "0", GainOrLoss: "0" }

    let i = 1;
    for (const trade of fourteenTrades) {
      subTotal.Proceeds = round(add(subTotal.Proceeds, trade.Proceeds), 2);
      subTotal.Cost = round(add(subTotal.Cost, trade.Cost), 2);
      subTotal.GainOrLoss = round(add(subTotal.GainOrLoss, trade.GainOrLoss), 2);
      for (const [key, value] of Object.entries(trade)) {
        subF8949[`ST${i}${key}`] = value.match(/^-?[0-9]+.?[0-9]*$/) ? round(value, 2) : value;
      }
      i += 1;
    }
    subF8949.STTotalProceeds = round(subTotal.Proceeds, 2);
    subF8949.STTotalCost = round(subTotal.Cost, 2);
    subF8949.STTotalAdjustment = '';
    subF8949.STTotalGainOrLoss = round(subTotal.GainOrLoss, 2);

    return subF8949;
  }

  // Build a series of forms from chunks of trades
  const chunkSize = 14;
  return trades.map((e,i) =>
     i % chunkSize === 0 ? trades.slice(i, i + chunkSize) : null
  ).filter(e => !!e).map(buildF8949);
}

module.exports = { parseF8949 }
