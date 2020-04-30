import { ContextLogger, LevelLogger } from "@finances/core";
import { CapitalGainsLog, Logs, LogTypes } from "@finances/types";

import { env } from "../env";
import { add, div, eq, mul, round, sub, toFormDate } from "../utils";
import { Forms } from "../types";

const msPerDay = 1000 * 60 * 60 * 24;
const msPerYear = msPerDay * 365;

export const f8949 = (vmLogs: Logs, oldForms: Forms): Forms  => {
  const log = new ContextLogger("f8949", new LevelLogger(env.logLevel));
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;

  const { f1040 } = forms;
  const trades = vmLogs
    .filter(vmLog => vmLog.type === LogTypes.CapitalGains)
    .filter(vmLog => !eq(round(vmLog.quantity, 4), "0")) as CapitalGainsLog[];
  const f8949Base = {} as any;

  // Set values constant across all f8949 forms
  f8949Base.P1_FullName = `${f1040.FirstNameMI} ${f1040.LastName}`;
  f8949Base.P1_SSN = f1040.SocialSecurityNumber;
  f8949Base.P2_FullName = f8949Base.P1_FullName;
  f8949Base.P2_SSN = f8949Base.P1_SSN;

  ////////////////////////////////////////
  // Format results into forms

  const buildF8949 = (shortTerm: CapitalGainsLog[], longTerm: CapitalGainsLog[]): any => {
    const subF8949 = JSON.parse(JSON.stringify(f8949Base)) as any;

    subF8949.P1C0_C = shortTerm.length > 0;
    let subTotal = { cost: "0", gainOrLoss: "0", proceeds: "0" };
    let i = 1;
    for (const trade of shortTerm) {
      const description = `${round(trade.quantity, 4)} ${trade.assetType}`;
      const proceeds = mul(trade.quantity, trade.assetPrice);
      const cost = mul(trade.quantity, trade.purchasePrice);
      const gainOrLoss = sub(proceeds, cost);
      const timeHeld = round(div(
        (new Date(trade.date).getTime() - new Date(trade.purchaseDate).getTime()).toString(),
        msPerDay.toString(),
      ));
      log.info(`Sold ${description} after ${timeHeld} days | ${round(proceeds)} - ${round(cost)} = ${round(gainOrLoss)}`);
      subTotal.proceeds = round(add([subTotal.proceeds, proceeds]));
      subTotal.cost = round(add([subTotal.cost, cost]));
      subTotal.gainOrLoss = round(add([subTotal.gainOrLoss, gainOrLoss]));
      subF8949[`P1L1R${i}a`] = description;
      subF8949[`P1L1R${i}b`] = toFormDate(trade.purchaseDate);
      subF8949[`P1L1R${i}c`] = toFormDate(trade.date);
      subF8949[`P1L1R${i}d`] = round(proceeds);
      subF8949[`P1L1R${i}e`] = round(cost);
      subF8949[`P1L1R${i}g`] = round(gainOrLoss);
      i += 1;
    }
    subF8949.P1L2d = round(subTotal.proceeds);
    subF8949.P1L2e = round(subTotal.cost);
    subF8949.P1L2h = round(subTotal.gainOrLoss);

    subF8949.P2C0_F = longTerm.length > 0;
    subTotal = { cost: "0", gainOrLoss: "0", proceeds: "0" };
    i = 1;
    for (const trade of longTerm) {
      const description = `${round(trade.quantity, 4)} ${trade.assetType}`;
      const proceeds = mul(trade.quantity, trade.assetPrice);
      const cost = mul(trade.quantity, trade.purchasePrice);
      const gainOrLoss = sub(proceeds, cost);
      const timeHeld = round(div(
        (new Date(trade.date).getTime() - new Date(trade.purchaseDate).getTime()).toString(),
        msPerDay.toString(),
      ));
      log.info(`Sold ${description} after ${timeHeld} days | ${round(proceeds)} - ${round(cost)} = ${round(gainOrLoss)}`);
      subTotal.proceeds = round(add([subTotal.proceeds, proceeds]));
      subTotal.cost = round(add([subTotal.cost, cost]));
      subTotal.gainOrLoss = round(add([subTotal.gainOrLoss, gainOrLoss]));
      subF8949[`P2L1R${i}a`] = description;
      subF8949[`P2L1R${i}b`] = toFormDate(trade.purchaseDate);
      subF8949[`P2L1R${i}c`] = toFormDate(trade.date);
      subF8949[`P2L1R${i}d`] = round(proceeds);
      subF8949[`P2L1R${i}e`] = round(cost);
      subF8949[`P2L1R${i}g`] = round(gainOrLoss);
      i += 1;
    }
    subF8949.P2L2d = round(subTotal.proceeds);
    subF8949.P2L2e = round(subTotal.cost);
    subF8949.P2L2h = round(subTotal.gainOrLoss);

    return subF8949;
  };

  // Merge trades w the same recieved & sold dates
  const mergedTrades = [];
  for (const trade of trades) {
    const dup = mergedTrades.findIndex(merged =>
      merged.assetType === trade.assetType &&
      merged.date.split("T")[0] === trade.date.split("T")[0] &&
      merged.purchaseDate.split("T")[0] === trade.purchaseDate.split("T")[0],
    );
    if (dup !== -1) {
      mergedTrades[dup].quantity = add([mergedTrades[dup].quantity, trade.quantity]);
    } else {
      mergedTrades.push(trade);
    }
  }

  // Sort trades into long-term/short-term
  const shortTermTrades = mergedTrades.filter(trade =>
    (new Date(trade.date).getTime() - new Date(trade.purchaseDate).getTime()) < msPerYear,
  );

  const longTermTrades = mergedTrades.filter(trade =>
    (new Date(trade.date).getTime() - new Date(trade.purchaseDate).getTime()) >= msPerYear,
  );

  // Build a series of forms from chunks of trades
  const chunkSize = 14;

  const longChunks = longTermTrades.map((e,i) =>
     i % chunkSize === 0 ? longTermTrades.slice(i, i + chunkSize) : null,
  ).filter(e => !!e);

  const shortChunks = shortTermTrades.map((e,i) =>
     i % chunkSize === 0 ? shortTermTrades.slice(i, i + chunkSize) : null,
  ).filter(e => !!e);

  const nPages = longChunks.length > shortChunks.length ? longChunks.length : shortChunks.length;

  const f8949 = [];
  for (let page = 0; page < nPages; page++) {
    f8949.push(buildF8949(shortChunks[page] || [], longChunks[page] || []));
  }

  return { ...forms, f8949 };
};
