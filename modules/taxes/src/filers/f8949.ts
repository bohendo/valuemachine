import { ContextLogger, LevelLogger } from "@finances/core";
import { Log, LogTypes } from "@finances/types";

import { env } from "../env";
import { add, mul, round, sub, toFormDate } from "../utils";
import { Forms } from "../types";

export const f8949 = (vmLogs: Log[], oldForms: Forms): Forms  => {
  const log = new ContextLogger("f8949", new LevelLogger(env.logLevel));
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;

  const { f1040 } = forms;
  const trades = vmLogs.filter(log => log.type === LogTypes.CapitalGains);
  const f8949 = {} as any;

  // Set values constant across all f8949 forms
  f8949.f1_1 = `${f1040.FirstNameMI} ${f1040.LastName}`;
  f8949.f1_2 = f1040.SocialSecurityNumber;
  f8949.f2_1 = f8949.f1_1;
  f8949.f2_2 = f8949.f1_2;

  ////////////////////////////////////////
  // Format results into forms

  const buildF8949 = (fourteenTrades): any => {
    const subF8949 = JSON.parse(JSON.stringify(f8949)) as any;

    // TODO: identify & properly handle long-term capital gains
    subF8949.c1_1_2 = true;

    const subTotal = { cost: "0", gainOrLoss: "0", proceeds: "0" };

    let i = 3;
    for (const trade of fourteenTrades) {
      const description = `${round(trade.quantity, 4)} ${trade.assetType}`;
      const proceeds = mul(trade.quantity, trade.assetPrice);
      const cost = mul(trade.quantity, trade.purchasePrice);
      const gainOrLoss = sub(proceeds, cost);
      log.info(`Sold ${description} | ${round(proceeds)} - ${round(cost)} = ${round(gainOrLoss)}`);
      subTotal.proceeds = round(add([subTotal.proceeds, proceeds]));
      subTotal.cost = round(add([subTotal.cost, cost]));
      subTotal.gainOrLoss = round(add([subTotal.gainOrLoss, gainOrLoss]));
      subF8949[`f1_${i}`] = description;
      subF8949[`f1_${i+1}`] = toFormDate(trade.purchaseDate);
      subF8949[`f1_${i+2}`] = toFormDate(trade.date);
      subF8949[`f1_${i+3}`] = round(proceeds);
      subF8949[`f1_${i+4}`] = round(cost);
      subF8949[`f1_${i+7}`] = round(gainOrLoss);
      i += 8;
    }
    subF8949.f1_115 = round(subTotal.proceeds);
    subF8949.f1_116 = round(subTotal.cost);
    subF8949.f1_119 = round(subTotal.gainOrLoss);

    return subF8949;
  };

  // Build a series of forms from chunks of trades
  const chunkSize = 14;
  const tradeChunks = trades.map((e,i) =>
     i % chunkSize === 0 ? trades.slice(i, i + chunkSize) : null,
  ).filter(e => !!e);

  return {
    ...forms,
    f8949: (tradeChunks.length === 0) ? [buildF8949([])] : tradeChunks.map(buildF8949),
  };
};
