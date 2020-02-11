import { add, eq, gt, lt, mul, round, sub, } from '../utils';
import { FinancialData, Forms, Event } from '../types';

export const f8949 = (finances: FinancialData, oldForms: Forms): Forms  => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040, f8949 } = forms;

  const debugMode = finances.input.logLevel > 3

  const trades = finances.taxableTrades;

  // Set values constant across all f8949 forms
  f8949.f1_1 = `${f1040.FirstNameMI} ${f1040.LastName}`;
  f8949.f1_2 = f1040.SocialSecurityNumber;
  f8949.f2_1 = f8949.f1_1;
  f8949.f2_2 = f8949.f1_2;

  ////////////////////////////////////////
  // Format results into forms

  const buildF8949 = (fourteenTrades) => {
    const subF8949 = JSON.parse(JSON.stringify(f8949)) as any;

    // TODO: identify & properly handle long-term capital gains
    subF8949.c1_1_2 = true;

    const subTotal = { Proceeds: "0", Cost: "0", GainOrLoss: "0" }

    let i = 3;
    for (const trade of fourteenTrades) {
      subTotal.Proceeds = round(add([subTotal.Proceeds, trade.Proceeds]));
      subTotal.Cost = round(add([subTotal.Cost, trade.Cost]));
      subTotal.GainOrLoss = round(add([subTotal.GainOrLoss, trade.GainOrLoss]));
      subF8949[`f1_${i}`] = trade.Description
      subF8949[`f1_${i+1}`] = trade.DateAcquired
      subF8949[`f1_${i+2}`] = trade.DateSold
      subF8949[`f1_${i+3}`] = round(trade.Proceeds)
      subF8949[`f1_${i+4}`] = round(trade.Cost)
      subF8949[`f1_${i+7}`] = round(trade.GainOrLoss)
      i += 8;
    }
    subF8949.f1_115 = round(subTotal.Proceeds);
    subF8949.f1_116 = round(subTotal.Cost);
    subF8949.f1_119 = round(subTotal.GainOrLoss);

    return subF8949;
  }

  // Build a series of forms from chunks of trades
  const chunkSize = 14;
  const tradeChunks = trades.map((e,i) =>
     i % chunkSize === 0 ? trades.slice(i, i + chunkSize) : null
  ).filter(e => !!e)

  return {
    ...forms,
    f8949: (tradeChunks.length === 0) ? [buildF8949([])] : tradeChunks.map(buildF8949)
  };
}