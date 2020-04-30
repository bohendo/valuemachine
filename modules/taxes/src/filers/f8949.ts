import { ContextLogger, LevelLogger } from "@finances/core";
import { CapitalGainsLog, Logs, LogTypes } from "@finances/types";

import { env } from "../env";
import { add, div, eq, gt, mul, round, sub, toFormDate } from "../utils";
import { Forms } from "../types";

const msPerDay = 1000 * 60 * 60 * 24;
const msPerYear = msPerDay * 365;

export const f8949 = (vmLogs: Logs, oldForms: Forms): Forms  => {
  const log = new ContextLogger("f8949", new LevelLogger(env.logLevel));
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const f1040 = forms.f1040;
  let f8949 = forms.f8949;

  ////////////////////////////////////////
  // Format results into forms

  // Merge trades w the same recieved & sold dates
  const mergedTrades = [];
  vmLogs
    .filter(vmLog => vmLog.type === LogTypes.CapitalGains)
    .filter(vmLog => !eq(round(vmLog.quantity, 4), "0"))
    .forEach((trade: CapitalGainsLog): void => {
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
    });

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

  const columns = ["d", "e", "g", "h"];
  const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  const getLongCell = (row: number, column: string): string => `P2L1R${row}${column}`;
  const getShortCell = (row: number, column: string): string => `P1L1R${row}${column}`;

  // Convert chunk of vmLogs into f8949 rows
  for (let page = 0; page < nPages; page++) {
    f8949.push(((): any => {
      const shortTerm = shortChunks[page] || [];
      const longTerm = longChunks[page] || [];
      const subF8949 = {} as any;
      subF8949.P1C0_C = shortTerm.length > 0;
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
        subF8949[getShortCell(i, "a")] = description;
        subF8949[getShortCell(i, "b")] = toFormDate(trade.purchaseDate);
        subF8949[getShortCell(i, "c")] = toFormDate(trade.date);
        subF8949[getShortCell(i, "d")] = round(proceeds);
        subF8949[getShortCell(i, "e")] = round(cost);
        subF8949[getShortCell(i, "h")] = round(gainOrLoss);
        i += 1;
      }
      subF8949.P2C0_F = longTerm.length > 0;
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
        subF8949[getLongCell(i, "a")] = description;
        subF8949[getLongCell(i, "b")] = toFormDate(trade.purchaseDate);
        subF8949[getLongCell(i, "c")] = toFormDate(trade.date);
        subF8949[getLongCell(i, "d")] = round(proceeds);
        subF8949[getLongCell(i, "e")] = round(cost);
        subF8949[getLongCell(i, "h")] = round(gainOrLoss);
        i += 1;
      }
      return subF8949;
    })());
  }

  // Calculate totals from f8949 rows
  f8949 = f8949.map((page, p): any => {
    page.P1_FullName = `${f1040.FirstNameMI} ${f1040.LastName}`;
    page.P1_SSN = f1040.SocialSecurityNumber;
    page.P2_FullName = page.P1_FullName;
    page.P2_SSN = page.P1_SSN;
    const shortTotal = {};
    const longTotal = {};
    for (const column of columns) {
      shortTotal[column] = "0";
      longTotal[column] = "0";
    }
    for (const column of columns) {
      for (const row of rows) {
        const shortCell = getShortCell(row, column);
        const longCell = getLongCell(row, column);
        if (gt(page[shortCell], "0")) {
          log.info(`Adding short ${page[shortCell]} to ${shortTotal[column]}`);
        }
        if (gt(page[longCell], "0")) {
          log.info(`Adding long ${page[longCell]} to ${longTotal[column]}`);
        }
        shortTotal[column] = round(add([shortTotal[column], page[shortCell]]));
        longTotal[column] = round(add([longTotal[column], page[longCell]]));
      }
    }
    for (const column of columns) {
      log.info(`Subtotal ${p} ${column}: short=${shortTotal[column]} long=${longTotal[column]}`);
      page[`P1L2${column}`] = round(shortTotal[column]);
      page[`P2L2${column}`] = round(longTotal[column]);
    }
    return page;
  });

  return { ...forms, f8949 };
};
