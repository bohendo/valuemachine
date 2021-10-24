import { TradeEvent, Events, EventTypes } from "@finances/types";
import { math } from "@finances/utils";

import { Forms } from "../types";
import { logger, toFormDate } from "../utils";

const { add, gt, mul, round, sub } = math;

const msPerDay = 1000 * 60 * 60 * 24;
const msPerYear = msPerDay * 365;

type Trade = {
  date: string;
  purchaseDate: string;
  asset: string;
  assetPrice: string;
  receivePrice: string;
  quantity: string;
};

export const f8949 = (vmEvents: Events, oldForms: Forms): Forms  => {
  const log = logger.child({ module: "f8949" });
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const f1040 = forms.f1040;
  let f8949 = forms.f8949;

  ////////////////////////////////////////
  // Format results into forms

  const getDate = (timestamp: string): string => timestamp.split("T")[0];

  // Merge trades w the same received & sold dates
  const trades = [] as Trade[];
  vmEvents
    .filter(vmEvent => vmEvent.type === EventTypes.Trade)
    .forEach((vmEvent: TradeEvent): void => {
      if (vmEvent.spentChunks.length) {
        for (const chunk of vmEvent.spentChunks) {
          trades.push({
            date: getDate(vmEvent.date),
            asset: chunk.asset,
            receivePrice: chunk.receivePrice,
            assetPrice: vmEvent.prices[chunk.asset],
            purchaseDate: chunk.receiveDate,
            quantity: chunk.quantity,
          });
        }
      }
    });

  // Sort trades into chunks of 14 long-term/short-term trades

  const columns = ["d", "e", "g", "h"];
  const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  const isLongTerm = (trade: Trade): boolean => 
    (new Date(trade.date).getTime() - new Date(trade.purchaseDate).getTime()) >= msPerYear;

  const chunkify = (list: any[]): any[][] => list.map(
    (e,i) => i % rows.length === 0 ? list.slice(i, i + rows.length) : null,
  ).filter(e => !!e);

  const shortChunks = chunkify(trades.filter(trade => !isLongTerm(trade)));
  const longChunks = chunkify(trades.filter(isLongTerm));

  const nPages = longChunks.length > shortChunks.length ? longChunks.length : shortChunks.length;

  const getLongCell = (row: number, column: string): string => `P2L1R${row}${column}`;
  const getShortCell = (row: number, column: string): string => `P1L1R${row}${column}`;

  // Convert chunk of vmEvents into f8949 rows
  for (let page = 0; page < nPages; page++) {
    const shortTerm = shortChunks[page] || [];
    const longTerm = longChunks[page] || [];
    const subF8949 = {} as any;
    subF8949.P1C0_C = shortTerm.length > 0;
    subF8949.P2C0_F = longTerm.length > 0;
    const parseTrade = getCell => (trade: Trade, index: number): void => {
      const i = index + 1;
      const description = `${round(trade.quantity, 4)} ${trade.asset}`;
      const proceeds = round(mul(trade.quantity, trade.assetPrice));
      const cost = round(mul(trade.quantity, trade.receivePrice));
      const gainOrLoss = sub(proceeds, cost);
      const pad = (str: string, n = 9): string => str.padStart(n, " ");
      log.info(
        `${trade.date.split("T")[0]} Sold ${pad(math.round(trade.quantity, 3))} ` +
        `${pad(trade.asset, 4)} for ${pad(proceeds)} - ` + 
        `${pad(cost)} = ${pad(gainOrLoss)} profit`,
      );
      subF8949[getCell(i, "a")] = description;
      subF8949[getCell(i, "b")] = toFormDate(trade.purchaseDate);
      subF8949[getCell(i, "c")] = toFormDate(trade.date);
      subF8949[getCell(i, "d")] = proceeds;
      subF8949[getCell(i, "e")] = cost;
      subF8949[getCell(i, "h")] = gainOrLoss;
    };
    shortTerm.forEach(parseTrade(getShortCell));
    longTerm.forEach(parseTrade(getShortCell));
    f8949.push(subF8949);
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
          log.debug(`Adding short-term trade ${page[shortCell]} to ${shortTotal[column]}`);
        }
        if (gt(page[longCell], "0")) {
          log.debug(`Adding long-term trade ${page[longCell]} to ${longTotal[column]}`);
        }
        shortTotal[column] = add(shortTotal[column], page[shortCell]);
        longTotal[column] = add(longTotal[column], page[longCell]);
      }
    }
    for (const column of columns) {
      log.debug(`Subtotal ${p} ${column}: short=${shortTotal[column]} long=${longTotal[column]}`);
      page[`P1L2${column}`] = round(shortTotal[column]);
      page[`P2L2${column}`] = round(longTotal[column]);
    }
    return page;
  });

  return { ...forms, f8949 };
};
